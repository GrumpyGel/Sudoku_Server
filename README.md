# Sudoku_Server
Node.JS RESTful server side facilities to Sudoku_Client for sharing scores

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]



<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/GrumpyGel/Sudoku_Server">
    <img src="SudokuScreen_2.png" alt="Logo" width="180">
  </a>

  <h3 align="center">Sudoku_Server</h3>

  <p align="center">
    Node.JS RESTful server side facilities to Sudoku_Client for sharing scores
    <br />
    <a href="https://github.com/GrumpyGel/Sudoku_Server"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="http://www.mydocz.com/Sudoku/Sudoku.html">View Demo</a>
    ·
    <a href="https://github.com/GrumpyGel/Sudoku_Server/issues">Report Bug</a>
    ·
    <a href="https://github.com/GrumpyGel/Sudoku_Server/issues">Request Feature</a>
  </p>
</p>



<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary><h2 style="display: inline-block">Table of Contents</h2></summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#installation--usage">Installation &amp; Usage</a></li>
    <li><a href="#documentation">Documentation</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgements">Acknowledgements</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

This provides server side functionality to enable registration of Sudoku players and share their scores/best times

Written in Node.JS using RESTful API calls from the Sudoku_Client with cryptography to create a 128 bit random tokens representing the client device for subsequent updating of scores.  Also shared by the Angular version of the MyDocz website, it provides scores/best times data API for collection of data.

Designed to run on Windows Server under IIS using a SQL Server database. Unlike the client, which runs asyncronously, the services provided by the Sudoku_Server are procedural and use promises to run syncronously. The API is RESTful with exchange of data in JSON format and state plus authentication cached on clients. It implements various libraries, please see <a href="#acknowledgements">Acknowledgements</a> for details.

The SudokuScores class used in Sudoku_Client is also used by Sudoku_Server.  The SudokuScores.bat script copies in the SudokuScores.js file from the Client area and wraps the necessary code to enable the class to function in Node.JS.

<!-- GETTING STARTED -->

## Installation & Usage

Clone the repo
   ```sh
   git clone https://github.com/GrumpyGel/Sudoku_Server.git
   ```

The components listed in <a href="#acknowledgements">Acknowledgements</a> also require installation.

Further information is required in this ReadMe for instruction on how to install these, configure the web server and how the HTTP hit to 'private.domain' is used to access database credentials and cryptography key securely.


<!-- DOCUMENTATION -->
## Documentation

The SudokuServer.js file contains embedded documentation.


<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.



<!-- CONTACT -->
## Contact

Email - [grumpygel@mydocz.com](mailto:grumpygel@mydocz.com)

Project Link: [https://github.com/GrumpyGel/Sudoku_Server](https://github.com/GrumpyGel/Sudoku_Server)



<!-- ACKNOWLEDGEMENTS -->
## Acknowledgements

* [Best-README-Template](https://github.com/othneildrew/Best-README-Template)
* IISNode : IIS plug in to run Node.js apps under IIS.  [github](https://github.com/tjanczuk/iisnode)
* Express : Web application framework used for such things as routing.   [website](https://expressjs.com/) [github](https://github.com/expressjs/express)
* cors : Express middleware for cors request handling from client.  [website](https://expressjs.com/en/resources/middleware/cors.html) [github](https://github.com/expressjs/cors)
* mssql : A SQL Server client library built on Tedious.  [github](https://github.com/tediousjs/node-mssql)
* crypto : A wrapper for OpenSSL cryptographic functions and used for hashing.  [website](https://nodejs.org/en/knowledge/cryptography/how-to-use-crypto-module/)
* axios : Promise based HTTP client used to download secure data (passwords & keys).  [website](https://axios-http.com/) [github](https://github.com/axios/axios)
* Ajv JSON schema validator [website](https://ajv.js.org/) [github](https://github.com/ajv-validator/ajv)






<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/GrumpyGel/Sudoku_Server.svg?style=for-the-badge
[contributors-url]: https://github.com/GrumpyGel/Sudoku_Server/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/GrumpyGel/Sudoku_Server.svg?style=for-the-badge
[forks-url]: https://github.com/GrumpyGel/Sudoku_Server/network/members
[stars-shield]: https://img.shields.io/github/stars/GrumpyGel/Sudoku_Server.svg?style=for-the-badge
[stars-url]: https://github.com/GrumpyGel/Sudoku_Server/stargazers
[issues-shield]: https://img.shields.io/github/issues/GrumpyGel/Sudoku_Server.svg?style=for-the-badge
[issues-url]: https://github.com/GrumpyGel/Sudoku_Server/issues
[license-shield]: https://img.shields.io/github/license/GrumpyGel/Sudoku_Server.svg?style=for-the-badge
[license-url]: https://github.com/GrumpyGel/Sudoku_Server/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/gerald-moull-41b5265
