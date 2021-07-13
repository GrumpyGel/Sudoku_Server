/*
    ===========================
    Coding for the SudokuServer
    ===========================

    SudokuServer.js is a Node.js app that uses various libraries described below.

    It runs on Windows Server, using IIS and a SQL Server database.

    Libraries used:
        "IISNode" : IIS plug in to run Node.js apps under IIS.
        "Express" : Web application framework used for such things as routing.
        "cors" : Express middleware for cors request handling from client.
        "mssql" : A SQL Server client library built on Tedious.
        "crypto" : A wrapper for OpenSSL cryptographic functions and used for hashing.
        "axios" : Promise based HTTP client used to download secure date (passwords & keys).
        "ajv" : A JSON schema library, used to validate submitted content.
        "SudokuScores" : A MyDocz class used to add logic and structure to scoring in Sudoku by MyDocz.

    The following services are performed by sudokuServer:

    Register:

        Registers a new client (device) on the MyDocz server.  This enables them to share scores.

    Update:

        Update the scores for this client and download the scores for other clients (devices) for this user.

    BestTimes:

        Called from Angular Best Times page in website to return pages of best times.


    To Debug SudokuServer set sc_UrlScoresServer = "http://dev.mydocz.com:3010/SudokuServer/";

*/

var c_Express = require('express');
var c_Cors = require('cors');
var c_Sql = require("mssql");
var c_Crypto = require('crypto');
var c_Axios = require('axios');
//var c_Fs = require('fs');
var c_AjvDef = require('ajv');
const { SudokuScores, ss_Region } = require('./SudokuScoresModule');
const { promisify } = require('util');
const { SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION } = require('constants');

const c_AjvBestTimesSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "BestTimesParameters",
    "type": "object",
    "required": ["Level", "Hints", "Order", "PageNo", "PageSize"],
    "properties": {
        "Level": { "type": "string", "enum": [ "Easy", "Medium" ] },
        "Hints": { "type": "string", "enum": [ "Yes", "No" ] },
        "Order": { "type": "string", "enum": [ "UserName", "Games", "Best", "Average" ] },
        "PageNo": { "type": "integer", "minimum": 1, },
        "PageSize": { "type": "integer", "minimum": 1, } },
    "additionalProperties": false,
}

var c_ConnStr = { user: 'sudoku', password: '', server: "dc", database: 'sudoku', options: { encrypt: true, enableArithAbort: true, instanceName: 'SQLEXPRESS' } };
var c_ResourcesLoaded = false;
var c_PasswordHash = "";
var c_App = c_Express();
var c_Ajv = new c_AjvDef();
var c_AjvSudokuScores = null;
var c_AjvBestTimes = null;

c_App.use(c_Express.json());       // to support JSON-encoded bodies
c_App.use(c_Cors({ origin: '*', methods: 'POST, GET, OPTIONS', headers: 'Content-Type' }));


//  ===========================================================================================
//  Common Utility functions
//
//  These are common routines shared by the services.
//  ===========================================================================================

//
//  Initialisation routine to get required security info and initialise schema processing.
//
async function GetResources() {
    var i_Hit = null;

    if (c_ResourcesLoaded == true) {
        return; }
    i_Hit = await c_Axios.get("http://private.mydocz.com/SudokuScores.json");
    c_PasswordHash = i_Hit.data.PasswordHash;
    c_ConnStr.password = i_Hit.data.PasswordDB;

    c_AjvSudokuScores = c_Ajv.compile(SudokuScores.GetSchema());
    c_AjvBestTimes = c_Ajv.compile(c_AjvBestTimesSchema);
    c_ResourcesLoaded = true;
}

//
//  Routine to insert a row into a database and return the incremented ID for the new row.
//  p_Request is a mssql request that must have had any parameters set beforehand.
//  p_Command is the full INSERT SQL statement.
//
async function InsertWithID(p_Request, p_Command) {
    var i_Command = "";
    var i_Results = null;

    i_Command = p_Command + "; SELECT SCOPE_IDENTITY() AS id";
    i_Results = await p_Request.query(i_Command);
    if (i_Results.recordset.length !=1) {
        return -1; }
    if (!i_Results.recordset[0].id) {
        return -2; }
    if (i_Results.recordset[0].id < 1) {
        return -3; }
    return i_Results.recordset[0].id;
}


//  ===========================================================================================
//  Service : Register
//
//  Create a new User and Token (for client/device) from supplied UserName.
//  Populate the Credentials object with UerID, Token and Hash to securely identify this client
//  when making subsequent service requests.
//  Save the initial client scores.
//  ===========================================================================================

async function DoRegister(p_Request, p_Response) {
    var i_Response = new SudokuScores();
    var i_Pool = null;
    var i_Query = null;
    var i_Results = null;
    var i_Transaction = null;
    var i_TransQuery = null;
    var i_Hmac = null;
    var i_UserID = 0;
    var i_UserName = "";
    var i_Token = "";
    var i_Hash = "";
    var i_RememberMe = "";

    await GetResources();
    if (c_PasswordHash == "") {
        throw new Error("Password not loaded"); }
//
//  Validate Post & Generate Token & Hash
//
    if (c_AjvSudokuScores(p_Request.body) == false) {
        throw new Error("Badly formatted Post"); }
    i_UserName = p_Request.body.Credentials.UserName;
    if (i_UserName == "") {
        throw new Error("Please supply User Name"); }

    i_Pool = await c_Sql.connect(c_ConnStr);
    i_Query = await i_Pool.request();
    i_Query.input("p_UserName", c_Sql.NVarChar, i_UserName);
    i_Results = await i_Query.query("SELECT * FROM u_Users WHERE u_UserName = @p_UserName");
    if (i_Results.recordset.length != 0) {
        throw new Error("User Name Already Used At MyDocz Sudoku"); }
    do {
        i_Token = c_Crypto.randomBytes(16).toString('hex');
        i_Query.replaceInput("p_Token", c_Sql.NVarChar, i_Token);
        i_Results = await i_Query.query("SELECT * FROM t_Tokens WHERE t_Token = @p_Token");
    } while (i_Results.recordset.length != 0)
//
//  Create DB Entry
//
    i_Transaction = new c_Sql.Transaction(i_Pool);
    await i_Transaction.begin();
    i_TransQuery = new c_Sql.Request(i_Transaction);
    i_TransQuery.input("p_UserName", c_Sql.NVarChar, i_UserName);
    i_UserID = await InsertWithID(i_TransQuery, "INSERT INTO u_Users (u_UserName) VALUES (@p_UserName)");
    if (i_UserID < 0) {
        throw new Error("Could not create User (" + i_UserID + ")"); }
    i_TransQuery.input('p_UserID', c_Sql.Int, i_UserID);
    i_TransQuery.input('p_Token', c_Sql.NVarChar, i_Token);
    i_TokenID = await InsertWithID(i_TransQuery, "INSERT INTO t_Tokens (t_UserID, t_Token) VALUES (@p_UserID, @p_Token)");
    if (i_TokenID < 0) {
        throw new Error("Could not create Security Token (" + i_TokenID + ")"); }
    i_TransQuery.input('p_TokenID', c_Sql.Int, i_TokenID);
    await DoRegister_InsertScores(i_TransQuery, 0, 0, p_Request.body.Local.Easy.Clean);
    await DoRegister_InsertScores(i_TransQuery, 0, 1, p_Request.body.Local.Easy.Hint);
    await DoRegister_InsertScores(i_TransQuery, 1, 0, p_Request.body.Local.Medium.Clean);
    await DoRegister_InsertScores(i_TransQuery, 1, 1, p_Request.body.Local.Medium.Hint);
    i_Transaction.commit();
    i_Pool.close();
//
//  Generate Response, there will be no other clients for the user, so no need to calc Server scores.
//
    i_RememberMe = i_UserID + ":" + i_Token;
    i_Hmac = c_Crypto.createHmac('sha1', c_PasswordHash);
    i_Hmac.update(i_RememberMe);
    i_Hash = i_Hmac.digest("hex");
    i_Response.Credentials.Version = 1;
    i_Response.Credentials.UserID = i_UserID;
    i_Response.Credentials.UserName = i_UserName;
    i_Response.Credentials.Token = i_Token;
    i_Response.Credentials.Hash = i_Hash;
    p_Response.json(i_Response);
}

//
//  Insert Scores for 1 Level/Hints combo.
//
async function DoRegister_InsertScores(p_Query, p_Level, p_Hints, p_Times) {
    p_Query.replaceInput('p_LevelID', c_Sql.Int, p_Level);
    p_Query.replaceInput('p_Hints', c_Sql.Int, p_Hints);
    p_Query.replaceInput('p_Games', c_Sql.Int, p_Times.Games);
    p_Query.replaceInput('p_Fastest', c_Sql.Int, p_Times.Fastest);
    p_Query.replaceInput('p_TotalTime', c_Sql.Int, p_Times.TotalTime);
    p_Query.replaceInput('p_TimedOut', c_Sql.Int, p_Times.TimedOut);
    await p_Query.query("INSERT INTO s_Scores (s_TokenID, s_LevelID, s_Hints, s_Games, s_Fastest, s_TotalTime, s_TimedOut) " +
                                "VALUES (@p_TokenID, @p_LevelID, @p_Hints, @p_Games, @p_Fastest, @p_TotalTime, @p_TimedOut)");
}


//  ===========================================================================================
//  Service : Update
//
//  Called to store updated client scores and download combined scores for this user's other clients/devices.
//  ===========================================================================================

async function DoUpdate(p_Request, p_Response) {
    var i_Response = { };
    var i_Pool = null;
    var i_Query = null;
    var i_Results = null;
    var i_Transaction = null;
    var i_TransQuery = null;
    var i_Credentials = null;
    var i_Local = null;
    var i_Hmac = null;
    var i_Hash = "";
    var i_RememberMe = "";

    await GetResources();
    if (c_PasswordHash == "") {
        throw new Error("Password not loaded"); }
//
//  Validate Post & extract and validate Authentification
//
    if (c_AjvSudokuScores(p_Request.body) == false) {
        throw new Error("Badly formatted Post"); }
    i_Credentials = p_Request.body.Credentials;
    i_Local = p_Request.body.Local;
    i_RememberMe = i_Credentials.UserID + ":" + i_Credentials.Token;
    i_Hmac = c_Crypto.createHmac('sha1', c_PasswordHash);
    i_Hmac.update(i_RememberMe);
    i_Hash = i_Hmac.digest("hex");
    if (i_Hash != i_Credentials.Hash) {
        throw new Error("Request failed security checks"); }

    i_Pool = await c_Sql.connect(c_ConnStr);
    i_Query = await i_Pool.request();
    i_Query.input("p_UserID", c_Sql.Int, i_Credentials.UserID);
    i_Query.input("p_Token", c_Sql.NVarChar, i_Credentials.Token);
    i_Results = await i_Query.query("SELECT * FROM t_Tokens WHERE t_UserID = @p_UserID AND t_Token = @p_Token");
    if (i_Results.recordset.length == 0) {
        throw new Error("Could not locate security token"); }
    if (i_Results.recordset.length != 1) {
        throw new Error("Security token mismatch"); }
    i_TokenID = i_Results.recordset[0].t_TokenID;
//
//  Update scores DB Entry
//
    i_Transaction = new c_Sql.Transaction(i_Pool);
    await i_Transaction.begin();
    i_TransQuery = new c_Sql.Request(i_Transaction);
    i_TransQuery.input('p_TokenID', c_Sql.Int, i_TokenID);
    await DoUpdate_UpdateScores(i_TransQuery, 0, 0, p_Request.body.Local.Easy.Clean);
    await DoUpdate_UpdateScores(i_TransQuery, 0, 1, p_Request.body.Local.Easy.Hint);
    await DoUpdate_UpdateScores(i_TransQuery, 1, 0, p_Request.body.Local.Medium.Clean);
    await DoUpdate_UpdateScores(i_TransQuery, 1, 1, p_Request.body.Local.Medium.Hint);
    i_Transaction.commit();
//
//  Generate Response, total the scores for this User's other Clients/devices and store in the Server object of the response.
//
    i_Response.Credentials = i_Credentials;
    i_Response.Server = new ss_Region();
    i_Query.input("p_TokenID", c_Sql.Int, i_TokenID);
    i_Results = await i_Query.query("SELECT s_LevelID, s_Hints, SUM(s_Games) AS s_Games, SUM(s_Fastest) AS s_Fastest, SUM(s_TotalTime) AS s_TotalTime, SUM (s_TimedOut) AS s_TimedOut " +
                                        "FROM s_Scores INNER JOIN t_Tokens ON t_TokenID = s_TokenID " +
                                        "WHERE t_UserID = @p_UserID AND t_TokenID <> @p_TokenID " +
                                        "GROUP BY s_LevelID, s_Hints");
    for (i_Sub = 0; i_Sub < i_Results.recordset.length; i_Sub++) {
        switch (i_Results.recordset[i_Sub].s_LevelID + ":" + i_Results.recordset[i_Sub].s_Hints) {
            case "0:false": i_Times = i_Response.Server.Easy.Clean; break;
            case "0:true": i_Times = i_Response.Server.Easy.Hint; break;
            case "1:false": i_Times = i_Response.Server.Medium.Clean; break;
            case "1:true": i_Times = i_Response.Server.Medium.Hint; break;
            default: throw new Error("Invalid Score data encountered"); break; }
        i_Times.Games = i_Results.recordset[i_Sub].s_Games;
        i_Times.Fastest = i_Results.recordset[i_Sub].s_Fastest;
        i_Times.TotalTime = i_Results.recordset[i_Sub].s_TotalTime;
        i_Times.TimedOut = i_Results.recordset[i_Sub].s_TimedOut; }
    i_Pool.close();
    p_Response.json(i_Response);
}

//
//  Update Scores for 1 Level/Hints combo.
//
async function DoUpdate_UpdateScores(p_Query, p_Level, p_Hints, p_Times) {
    p_Query.replaceInput('p_LevelID', c_Sql.Int, p_Level);
    p_Query.replaceInput('p_Hints', c_Sql.Int, p_Hints);
    p_Query.replaceInput('p_Games', c_Sql.Int, p_Times.Games);
    p_Query.replaceInput('p_Fastest', c_Sql.Int, p_Times.Fastest);
    p_Query.replaceInput('p_TotalTime', c_Sql.Int, p_Times.TotalTime);
    p_Query.replaceInput('p_TimedOut', c_Sql.Int, p_Times.TimedOut);
    await p_Query.query("UPDATE s_Scores SET s_Games = @p_Games, s_Fastest = @p_Fastest, s_TotalTime = @p_TotalTime, s_TimedOut = @p_TimedOut " +
                            "WHERE s_TokenID = @p_TokenID AND s_LevelID =  @p_LevelID AND s_Hints = @p_Hints");
}


//  ===========================================================================================
//  Service : BestTimes
//
//  Called from Angular Best Times page in website.  Parameters:
//      "Level":        Which level to return scores for {Easy, Medium}.
//      "Hints":        Whether With or No hints {HintsYes, HintsNo}.
//      "Order":        Order of results {Name, Games, Best, Average}.
//      "PageNo":       Which page in results to return.
//      "PageSize":     How many results rows per page.
//  Returns:
//      "Level":        Requested level.
//      "Hints":        Requested hints.
//      "Order":        Requested order.
//      "PageNo":       Requested page number.
//      "PageSize":     Requested page size.
//      "PageQuantity": Number of pages that can be returned (only sent when PageNo = 1).
//      "Results":      Array of results {UserName, Games, Best, Avg}
//  ===========================================================================================

async function DoBestTimes(p_Request, p_Response) {
    var i_Response = { };
    var i_Pool = null;
    var i_Query = null;
    var i_Results = null;
    var i_Sql = "";

    await GetResources();

    if (c_AjvBestTimes(p_Request.body) == false) {
        throw new Error("Badly formatted Post"); }

    i_Pool = await c_Sql.connect(c_ConnStr);
    i_Query = await i_Pool.request();

    i_Sql = "SELECT u_UserName AS UserName, " +
                "SUM(s_Games) AS Games, MIN(s_Fastest) AS Best, SUM(s_TotalTime) / (SUM(s_Games) - SUM (s_TimedOut)) AS Avg " +
                "FROM u_Users " +
                "INNER JOIN t_Tokens ON t_UserID = u_UserID " +
                "INNER JOIN s_Scores ON s_TokenID = t_TokenID " +
                "WHERE s_LevelID = " + ((p_Request.body.Level == "Medium") ? "1" : "0") +
                    " AND s_Hints = " + ((p_Request.body.Hints == "Yes") ? "1" : "0") + " AND s_Games > s_TimedOut " +
                "GROUP BY u_UserName " +
                "ORDER BY " + ((p_Request.body.Order == "Games") ? "Games DESC, " : ((p_Request.body.Order == "Best") ? "Best, " : ((p_Request.body.Order == "Average") ? "Avg, " : ""))) + " UserName " +
                "OFFSET " + ((p_Request.body.PageNo - 1) * p_Request.body.PageSize) + " ROWS " +
                "FETCH NEXT " + p_Request.body.PageSize + " ROWS ONLY";
    i_Results = await i_Query.query(i_Sql);

    i_Response.Level = p_Request.body.Level;
    i_Response.Hints = p_Request.body.Hints;
    i_Response.Order = p_Request.body.Order;
    i_Response.PageNo = p_Request.body.PageNo;
    i_Response.PageSize = p_Request.body.PageSize;
    i_Response.Results = i_Results.recordset;

    if (p_Request.body.PageNo == 1) {
        i_Sql = "SELECT DISTINCT COUNT(*) OVER () AS RowQty " + i_Sql.substring(i_Sql.indexOf(" FROM "), i_Sql.indexOf(" ORDER BY "));
        i_Results2 = await i_Query.query(i_Sql);
        i_Response.PageQuantity =  Math.ceil(i_Results2.recordset[0].RowQty / p_Request.body.PageSize); }

    i_Pool.close();
    p_Response.json(i_Response);
}


//  ===========================================================================================
//  Express Routing
//
//  register the routes to call the necessary services above.
//  ===========================================================================================


c_App.post(["/SudokuServer/register","/register"], function (req, res) {
    DoRegister(req, res).catch(p_Error => { 
        var i_Error = {};
        i_Error.Error = p_Error.message;
        res.json(i_Error); } ) } );


c_App.get(["/SudokuServer/register","/register"], function (req, res) {
    DoRegister(req, res).catch(p_Error => { 
        var i_Error = {};
        i_Error.Error = p_Error.message;
        res.json(i_Error); } ) } );


c_App.post(["/SudokuServer/update","/update"],  function (req, res) {
    DoUpdate(req, res).catch(p_Error => { 
        var i_Error = {};
        i_Error.Error = p_Error.message;
        res.json(i_Error); } ) } );

c_App.post(["/SudokuServer/besttimes","/besttimes"],  function (req, res) {
    DoBestTimes(req, res).catch(p_Error => { 
        var i_Error = {};
        i_Error.Error = p_Error.message;
        res.json(i_Error); } ) } );

//
//  Uncomment as appropriate for live/development debugging.  Debug in Visual Studio Code.
//

c_App.listen(process.env.PORT);
//c_App.listen(3010);