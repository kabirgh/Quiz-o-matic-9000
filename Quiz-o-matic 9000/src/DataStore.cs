using System.Collections.Generic;
using System.Windows.Media;

namespace Quiz_o_matic_9000.src
{
    class DataStore
    {
        public static readonly string Title = "Quiz-o-matic 9000";

        // Colours
        public static readonly SolidColorBrush Red = new SolidColorBrush(Color.FromRgb(232, 41, 60));
        public static readonly SolidColorBrush Blue = new SolidColorBrush(Color.FromRgb(85, 150, 230));
        public static readonly SolidColorBrush Green = new SolidColorBrush(Color.FromRgb(0, 180, 160));
        public static readonly SolidColorBrush Yellow = new SolidColorBrush(Color.FromRgb(253, 214, 0));
        public static readonly SolidColorBrush Purple = new SolidColorBrush(Color.FromRgb(175, 110, 232));
        public static readonly SolidColorBrush Pink = new SolidColorBrush(Color.FromRgb(255, 113, 212));
        public static readonly SolidColorBrush White = new SolidColorBrush(Color.FromRgb(255, 255, 255));
        public static readonly SolidColorBrush MidBlue = new SolidColorBrush(Color.FromRgb(48, 90, 128));
        public static readonly SolidColorBrush Orange = new SolidColorBrush(Color.FromRgb(255, 146, 73));
        public static readonly SolidColorBrush LightGreen = new SolidColorBrush(Color.FromRgb(12, 183, 64));
        public static readonly SolidColorBrush LightBrown = new SolidColorBrush(Color.FromRgb(210, 176, 164));

        public static readonly SolidColorBrush[] teamColours = new SolidColorBrush[] {
            Red, Blue, Green, Yellow, Purple, Pink, White, MidBlue, Orange, LightGreen, LightBrown
        };

        public static Dictionary<int, TeamData> teams = new Dictionary<int, TeamData>();

        public static readonly Dictionary<int, TeamData> sampleTeams = new Dictionary<int, TeamData>()
        {
            [0] = new TeamData("9/9", Red),
            [1] = new TeamData("12B", Blue),
            [2] = new TeamData("Chixie Dix", Green),
            [3] = new TeamData("King in the Lounge", Yellow),
            [4] = new TeamData("Jumbo", Purple),
            [5] = new TeamData("Monkey bars", Pink),
            [6] = new TeamData("Alpha Kenny", White),
            [7] = new TeamData("Zoom angels", MidBlue),
            [8] = new TeamData("Clairvoyant", Orange),
            [9] = new TeamData("Alpaca", LightGreen)

        };

        public static int masterMouseID = -1;  // A right click on this mouse resets the game window. Allows reset away from keyboard
    }
}
