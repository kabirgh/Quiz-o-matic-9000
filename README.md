# Quiz-o-matic 9000
Quiz-o-matic is a Windows application that lets you use mice connected to the computer as buzzers. Upto 10 teams can click registered mice to show up on the screen, in order.

## Installation
Quiz-o-matic is a portable application that does not require a setup. The only prerequisite is a Windows operating system with a .NET runtime > 4.0.0 (sorry Mac folks, it needs a Windows-only library to distinguish multiple mice). To run the program,

1. Download the latest .zip file from the [Releases](https://github.com/kabir-plod/Quiz-o-matic-9000/releases) tab.
2. Extract the zip. Navigate to the `/bin/Release` folder within.
3. Double-click `Quiz-o-matic 9000.exe` to launch the program.

## Usage
### Main screen

![](https://zippy.gfycat.com/BlankOilyGreatdane.gif)

This is the window that shows up when you start the application.
On the main screen, you can:
- Add, name, colour and remove teams
- Assign mice to teams

When you're done, click the `Start` button to go to the game screen.

### Game screen

![](https://zippy.gfycat.com/LegalDeliciousBustard.gif)

The first team to click their mouse will show up on a rectangle with their name and colour at the top of the screen. Teams that click afterwards will be shown below. Further clicks from the same mouse will have no effect.
To remove all teams from the screen, press `R` on your keyboard. 
Since the Multipoint library Microsoft provides does not support clicking on the close button (yep, seriosuly), press `Esc` to quit the program. All keys used in the application are tabled below.

|Key|Function|
|---|--------|
|`Esc`|Quit the program|
|`Backspace`|Return to main screen|
|`R`|Reset. Remove all teams from game screen|
|`S`|Show all teams on game screen|

## Issues
Wireless mice have a noticeably higher latency when further away from the computer - mice that are clicked later but are closer to the computer might show up on the screen first.

## Bugs and feature requests
Raise an issue on this repo if you encounter bugs or have any feature requests. Feel free to submit PRs too.
