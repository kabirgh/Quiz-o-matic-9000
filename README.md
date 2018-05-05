# Quiz-o-matic 9000
Quiz-o-matic is a Windows application that lets you use mice connected to the computer as buzzers. Upto 10 teams can click registered mice to show up on the screen, in order. As of version 1.1, the application also supports [DIY buzzers](https://hackaday.io/project/152687-quiz-o-matic-wireless-buzzers).

## Installation
Quiz-o-matic is a portable application that does not require a setup. The only prerequisite is a Windows operating system with a .NET runtime > 4.5.2 (sorry Mac/Linux folks, it needs a Windows-only library to distinguish multiple mice). To run the program,

1. Download the latest .zip file from the [Releases](https://github.com/kabir-plod/Quiz-o-matic-9000/releases) tab.
2. Extract the zip. Double-click `Quiz-o-matic 9000.exe` to launch the program.

## Usage
### Main screen

![](https://zippy.gfycat.com/BlankOilyGreatdane.gif)

This is the window that shows up when you start the application.
On the main screen, you can:
- Add, name, colour and remove teams
- Assign mice to teams
- Register custom wireless buzzers that communicate over websockets
- Set a master mouse. During the game, a right click on only this mouse will reset the game screen. This feature was added so that the quizmaster can refresh the screen from the keyboard

#### Buzzers
To register the buzzers described [here](https://hackaday.io/project/152687-quiz-o-matic-wireless-buzzers), press and hold the button until a new row shows up on the game screen. This should take about 2 seconds. After writing a team name and selecting a colour, press the `Confirm` button to lock that team's name and colour.


When you're done, click the `Start` button to go to the game screen.

### Game screen

![](https://zippy.gfycat.com/LegalDeliciousBustard.gif)

The first team to click their mouse will show up on a rectangle with their name and colour at the top of the screen. Teams that buzz afterwards will be shown below, fastest nearer the top. In the gif above, 'You're a quizzard, Harry' buzzed first. Further clicks from the same device will have no effect until the screen is reset.
To reset all teams from the screen, press `R` on your keyboard, or right-click on the master mouse.
Since the Multipoint library Microsoft provides does not support clicking on the window close button (yep, seriosuly), press `Esc` to quit the program. All keys used in the application are tabled below.

|Key|Function|
|---|--------|
|`Esc`|Quit the program|
|`Backspace`|Return to main screen|
|`R`|Reset. Remove all teams from game screen in preparation for the next question|
|`S`|Show all teams on game screen|

## Issues
Wireless mice have a noticeably higher latency when further away from the computer - mice that are clicked later but are closer to the computer might show up on the screen first.

## Bugs and feature requests
Raise an issue on this repo if you encounter bugs or have any feature requests. Feel free to submit PRs too.
