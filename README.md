# Quiz-o-matic
Quiz-o-matic is a desktop application that lets you use game controllers as quiz buzzers. Up to 4 teams press a button any of the A/B/X/Y buttons to show up on the screen, in order. The application also supports [DIY buzzers](https://hackaday.io/project/158010-quiz-o-matic-wireless-buzzers).

If you're looking for the old version of this project that supported wireless mice as buzzers, you can find it in the `v1` branch.

## Installation
### Prerequisites
- go 1.21+
- NPM (Node 15+)
- Windows OS (might work on Mac/Linux, but this is untested)
- xinput game controllers

### Building
You will need to compile the program from source yourself:

1. Clone the repository.
2. Run `go install` in the root directory of the project.
3. Run `npm install` in the `frontend` directory.
4. Run `wails build` in the root directory of the project.
5. Double-click `build/bin/Quiz-o-matic 9000.exe` to launch the program.

## Usage
### Main screen

![](https://zippy.gfycat.com/BlankOilyGreatdane.gif)

This is the window that shows up when you start the application.
On the main screen, you can:
- Add, name, colour and remove teams
- Assign controllers to teams
- Assign [custom wireless buzzers](https://hackaday.io/project/158010-quiz-o-matic-wireless-buzzers) that communicate over websockets. If you won't use custom buzzers, you don't need to allow the program on Windows Firewall to the wireless network

When you're done, click the `Start` button to go to the game screen.

### Game screen

![](https://zippy.gfycat.com/LegalDeliciousBustard.gif)

The first team to buzz in by pressing any of the A/B/X/Y buttons will show up on a rectangle with their name and colour at the top of the screen. Teams that buzz afterwards will be shown below in descending order of how quickly they pressed. In the gif above, 'You're a quizzard, Harry' buzzed first. Further buzzes from the same device will have no effect until the screen is reset.
To reset all teams from the screen, press `R` on your keyboard.

|Key|Function|
|---|--------|
|`Esc`|Quit the program|
|`Backspace`|Return to main screen|
|`F`|Enable/disable fullscreen|
|`R`|Reset. Removes all teams from game screen in preparation for the next question|
|`S`|Show all teams on game screen|
|`Space`|Buzz in with the keyboard|

## Notes
This program uses [Wails](https://wails.io) to create a cross-platform desktop application with Go and Next.js.

## Contributing
Raise an issue on this repo if you encounter bugs or have any feature requests. Feel free to submit PRs too.
