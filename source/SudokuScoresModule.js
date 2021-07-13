/*
=======================
Class : SudokuScores
=======================

Class for managing Scores (Best Times) within the Sudoku by MyDocz game.
Scores are maintained in the Client and transfered to Server with both sides utilising the SudokuScores class.
The Server uses the data to create users/clients and update the scores database.
Ther Server will update the Server part of the SudokuScores class with combined scores of the Users's other Clients (currently not operational).

Usage : var SudokuScores = new SudokuScores()

Properties:
    Credentials : Credentials for the client of type ss_Credentials.  Name completed by User, credentials completed by server, stored on client and sent back to server as authorisation.
    Server : Server accumulated scores for other Clients linked to this User of type ss_Region (currently not operational).
    Local : Client maintained scores for this Client of type ss_Region.

Methods:
    GameFinished(Level, Hints, Time) : Called by client to record a completed game of the specified Level, Number of Hints and Time (Seconds) taken.
    GetCombined(Level) : Will return a ss_Region object of combined Server and Client scores (ie total for this user).
    Load(Store) : Load the SudokuScores property data from the stringify string Store of SudokuScores properties conforming to the SudokuScores schema.
    static Validate(JSon) : Validates JSon to the SudokuScores schema.
    static GetSchema() : Returns the SudokuBoards schema.


======================
Class : ss_Credentials
======================

Class for managing User and Credential details for the User within the Sudoku by MyDocz game.

Usage : var Credentials = new ss_Credentials()

Properties:
    Credentials : Credentials for the client of type ss_Credentials.  Name completed by User, credentials completed by server, stored on client and sent back to server as authorisation.
    Server : Server accumulated scores for clients linked to this one of type ss_Region (currently not operational).
    Local : Client maintained scores for this client of type ss_Region.
    Version : Currently 1, will be used to detect version changes in SudokuScores data stored locally and submitted to the Server.
    UserID : Initially 0, will be set by Server if User Shares Scores on this Client.
    UserName : Initially "", will be set by User when Sharing Scores.
    Token : Initially 0, will be set by Server if User Shares Scores on this Client.
    Hash : Initially 0, will be set by Server if User Shares Scores on this Client.

Methods:
    GameFinished(Level, Hints, Time) : Called by client to record a completed game of the specified Level, Number of Hints and Time (Seconds) taken.
    GetCombined(Level) : Will return a ss_Region object of combined Server and Client scores (ie total for this user).
    Load(Store) : Load the SudokuScores property data from the stringify string Store of SudokuScores properties conforming to the SudokuScores schema.
    static Validate(JSon) : Validates JSon to the SudokuScores schema.
    static GetSchema() : Returns the SudokuBoards schema.


=================
Class : ss_Region
=================

Class for managing Scores (Best Times) seperately for Client and Server within the Sudoku by MyDocz game.

Usage : var Region = new ss_Region()

Properties:
    Easy : An ss_Level object storing the Easy level scores for this region.
    Medium : An ss_Level object storing the Medium level scores for this region.

Methods:
    Load(JSon) : Load the ss_Region property data from the JSon conforming to the SudokuScores schema.


================
Class : ss_Level
================

Class for managing Scores (Best Times) for a Level within Client and Server within the Sudoku by MyDocz game.

Usage : var Level = new ss_Level(Level)

    Level : This Level, being "Easy" or "Medium".

Properties:
    Level : This Level, being "Easy" or "Medium".
    Hint : A ss_Times() object storing the scores for this level where hints were used.
    Clean : A ss_Times() object storing the scores for this level where hints were not used.

Methods:
    Load(JSon) : Load the ss_Level property data from the JSon conforming to the SudokuScores schema.
    GameFinished(Hints, Time) : Called by SudokuScores to record a completed game of the specified Number of Hints and Time (Seconds) taken.
    BestTimeHTML() : Called by the Client to return HTML presentation of Best Scores.
    static ToMinutes(Seconds) : Called internally to return a time string in "9:99" format from Seconds.


================
Class : ss_Times
================

Class for managing Scores (Best Times) for a Level within Client and Server within the Sudoku by MyDocz game.
Each class represents times that were either "Clean" (no hints used) or with "Hint".

Usage : var Times = new ss_Times()

Properties:
    Games : Number of Games played.
    Fastest : Time taken for the fastest game in seconds.
    TotalTime : Total time taken for all games in seconds, less those that timed out.
    TimedOut : Number of Games that Timed Out, ie took longer than 1 hour.

Methods:
    Load(JSon) : Load the ss_Times property data from the JSon conforming to the SudokuScores schema.
    GameFinished(Time) : Called by SudokuScores to record a completed game taking the specified Time (Seconds).
                         If Timed Out (greater than 1 hour), Games and TimedOut are incremented, TotalTime is not updated.
                         If not Timed Out, Games and TotalTime is updated and Fastest if the time is less.
    Average() : The Average time taken to play a game, those TimedOut are excluded.
                Time rounded down to nearest second.
    static GetCombined(Server, Local) : Is called by SudokuScores to return a new ss_Times object of combined Server and Local ss_Times.


*/

//
//  Coding for Scoring within the Sudoku Client.
//
//  SudokuScores : Main class, containg the following...
//  Credentials : Holds Info generated from server when registering to be able to update server.
//  Level : Holds the scores for a Level - eg number of games, total and fastest time.
//  Region : Holds Easy and Medium Levels for Server totals (other clients) and Local (this client).
//
const ss_Easy = "Easy";
const ss_Medium = "Medium";

const ss_Schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "SudokuScores",
    "type": "object",
    "required": ["Credentials"],
    "properties": {
        "Credentials": {
            "type": "object",
            "required": ["Version", "UserID", "UserName", "Token", "Hash"],
            "properties": {
                "Version": { "type": "number", "enum": [ 1 ] },
                "UserID": { "type": "number" },
                "UserName": { "type": "string" },
                "Token": { "type": "string" },
                "Hash": { "type": "string" } },
            "additionalProperties": false },
        "Server": { "$ref": "#/definitions/Region" },
        "Local": { "$ref": "#/definitions/Region" } },
    "additionalProperties": false,
    "definitions": {
        "Region": {
            "type": "object",
            "required": ["Easy", "Medium"],
            "properties": {
                "Easy": { "$ref": "#/definitions/Level" },
                "Medium": { "$ref": "#/definitions/Level" } },
            "additionalProperties": false },
        "Level": {
            "type": "object",
            "required": ["Level", "Hint", "Clean"],
            "properties": {
                "Level": { "type": "string" },
                "Hint": { "$ref": "#/definitions/Times" },
                "Clean": { "$ref": "#/definitions/Times" } },
            "additionalProperties": false },
        "Times": {
            "type": "object",
            "required": ["Games", "Fastest", "TotalTime", "TimedOut"],
            "properties": {
                "Games": { "type": "number" },
                "Fastest": { "type": "number" },
                "TotalTime": { "type": "number" },
                "TimedOut": { "type": "number" } },
            "additionalProperties": false } }
}


class ss_Credentials {
    constructor() {
        this.Version = 1;
        this.UserID = 0;
        this.UserName = "";
        this.Token = "";
        this.Hash = "";
    }

    Load(p_Credentials) {
        this.UserID = p_Credentials.UserID;
        this.UserName = p_Credentials.UserName;
        this.Token = p_Credentials.Token;
        this.Hash = p_Credentials.Hash;
    }
}


class ss_Times {
    constructor() {
        this.Games = 0;
        this.Fastest = 0;
        this.TotalTime = 0;
        this.TimedOut = 0;
    }

    Load(p_Times) {
        this.Games = p_Times.Games;
        this.Fastest = p_Times.Fastest;
        this.TotalTime = p_Times.TotalTime;
        this.TimedOut = p_Times.TimedOut;
    }

    GameFinished(p_Time) {
        this.Games++;
        if (p_Time > 3599) {
            this.TimedOut++; }
        else {
            if (this.Games == 1 || p_Time < this.Fastest) {
                this.Fastest = p_Time; }
            this.TotalTime = this.TotalTime + p_Time; }
    }

    Average() {
        return Math.floor(this.TotalTime / (this.Games - this.TimedOut));
    }

    static GetCombined(p_Server, p_Local) {
        var i_Combined = new ss_Times();

        i_Combined.Games = p_Server.Games + p_Local.Games;
        if (p_Server.Games == 0) {
            i_Combined.Fastest = p_Local.Fastest; }
        else {
            if (p_Local.Games == 0) {
                i_Combined.Fastest = p_Server.Fastest; }
            else {
                if (p_Local.Fastest < p_Server.Fastest) {
                    i_Combined.Fastest = p_Local.Fastest; }
                else {
                    i_Combined.Fastest = p_Server.Fastest; } } }
        i_Combined.TotalTime = p_Server.TotalTime + p_Local.TotalTime;
        i_Combined.TimedOut = p_Server.TimedOut + p_Local.TimedOut;
        return i_Combined;
    }
}


class ss_Level {
    constructor(p_Level) {
        this.Level = p_Level;
        this.Hint = new ss_Times();
        this.Clean = new ss_Times();
    }

    Load(p_Level) {
        this.Level = p_Level.Level;
        this.Hint.Load(p_Level.Hint);
        this.Clean.Load(p_Level.Clean);
    }

    GameFinished(p_HintQty, p_Time) {
        if (p_HintQty == 0) {
            this.Clean.GameFinished(p_Time); }
        else {
            this.Hint.GameFinished(p_Time); }
    }

    BestTimeHTML() {
        var i_HTML = "";

        if (this.Hint.Games == 0 && this.Clean.Games == 0) {
            return ""; }
        i_HTML = "<div class='scores_level'>" +
                    "<div class='scores_level_head'>Level : " + this.Level + "</div>" +
                    "<div class='scores_level_content'>" +
                        "<div class='scores_line scores_heading'>" +
                            "<div class='level'>Level</div>" +
                            "<div class='hints'>Hints</div>" +
                            "<div class='boards'>Boards</div>" +
                            "<div class='best'>Best</div>" +
                            "<div class='avg'>Average</div>" +
                        "</div>";
        if (this.Clean.Games != 0) {
            i_HTML = i_HTML +
                        "<div class='scores_line'>" +
                            "<div class='level'>" + this.Level + "</div>" +
                            "<div class='hints'>No</div>" +
                            "<div class='boards'>" + this.Clean.Games + "</div>" +
                            "<div class='best'>" + ss_Level.ToMinutes(this.Clean.Fastest) + "</div>" +
                            "<div class='avg'>" + ss_Level.ToMinutes(this.Clean.Average()) + "</div>" +
                        "</div>"; }
        if (this.Hint.Games != 0) {
            i_HTML = i_HTML +
                        "<div class='scores_line'>" +
                            "<div class='level'>" + ((this.Clean.Games == 0) ? this.Level : "") + "</div>" +
                            "<div class='hints'>Yes</div>" +
                            "<div class='boards'>" + this.Hint.Games + "</div>" +
                            "<div class='best'>" + ss_Level.ToMinutes(this.Hint.Fastest) + "</div>" +
                            "<div class='avg'>" + ss_Level.ToMinutes(this.Hint.Average()) + "</div>" +
                        "</div>"; }
        i_HTML = i_HTML + "</div></div>";
        return i_HTML;
    }

    static ToMinutes(p_Seconds) {
        var i_Minutes = Math.floor(p_Seconds / 60);
        var i_Seconds = p_Seconds - (i_Minutes * 60);
        return i_Minutes + ":" + ("00" + i_Seconds).slice(-2);
    }
}


class ss_Region {
    constructor() {
        this.Easy = new ss_Level(ss_Easy);
        this.Medium = new ss_Level(ss_Medium);
    }

    Load(p_Region) {
        this.Easy.Load(p_Region.Easy);
        this.Medium.Load(p_Region.Medium);
    }
}


class SudokuScores {
    constructor() {
        this.Credentials = new ss_Credentials();
        this.Server = new ss_Region();
        this.Local = new ss_Region();
    }

    static s_AjV = null;
    static s_AjVSchema = null;

    GameFinished(p_Level, p_Hints, p_Time) {
        switch (p_Level) {
            case ss_Easy:   this.Local.Easy.GameFinished(p_Hints, p_Time); break;
            case ss_Medium: this.Local.Medium.GameFinished(p_Hints, p_Time); break;
            default:        throw new Error("Invalid Sudoku Scores Level"); }
//      this.Save();
    }

    GetCombined(p_Level) {
        var i_Combined = new ss_Level(p_Level);

        switch (p_Level) {
            case ss_Easy:   i_Combined.Hint = ss_Times.GetCombined(this.Server.Easy.Hint, this.Local.Easy.Hint);
                            i_Combined.Clean = ss_Times.GetCombined(this.Server.Easy.Clean, this.Local.Easy.Clean);
                            break;
            case ss_Medium: i_Combined.Hint = ss_Times.GetCombined(this.Server.Medium.Hint, this.Local.Medium.Hint);
                            i_Combined.Clean = ss_Times.GetCombined(this.Server.Medium.Clean, this.Local.Medium.Clean);
                            break;
            default:        throw new Error("Invalid Sudoku Scores Level"); }
        return i_Combined;
    }

//    Save() {
//        localStorage.setItem("SudokuScores", JSON.stringify(this));
//    }

//
//  Load and Validate should only be used in the Client, not in Node.js due to Ajv
//
    Load(p_Store) {
        var i_Scores = null;

        i_Scores = JSON.parse(p_Store);
        if (SudokuScores.Validate(i_Scores) == false) {
            throw new Error("Sukdoku Scores Formatted Badly"); }
        this.Credentials.Load(i_Scores.Credentials);
        this.Server.Load(i_Scores.Server);
        this.Local.Load(i_Scores.Local);
    }

    static Validate(p_Scores) {
        if (SudokuScores.s_AjV == null) {
            SudokuScores.s_Ajv = new Ajv();
            SudokuScores.s_AjVSchema = SudokuScores.s_Ajv.compile(ss_Schema); }
        return SudokuScores.s_AjVSchema(p_Scores);
    }

    static GetSchema() {
        return ss_Schema;
    }
}
 
module.exports = { SudokuScores, ss_Region }; 
