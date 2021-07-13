rem
rem Copies the SudokuScores.js from client side build.
rem Names new file SudokuScoresModule.js.
rem Adds a return then module.exports statement to end of file.
rem This enables the SudokuScores class to be accessed from Node.js CommonJs.
rem
rem Maintenance should be performed in client side file
rem Followed by executing this script to update SudokuServer.
rem

del SudokuScoresModule.js
copy ..\SudokuClient\SudokuScores.js SudokuScoresModule.js
echo. >>SudokuScoresModule.js
echo module.exports = { SudokuScores, ss_Region }; >>SudokuScoresModule.js
pause