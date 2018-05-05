using Quiz_o_matic_9000.src;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Microsoft.Multipoint.Sdk;
using System;

namespace Quiz_o_matic_9000
{
    /// <summary>
    /// Interaction logic for GameWindow.xaml
    /// </summary>
    public partial class GameWindow : Window
    {
        private Dictionary<int, TeamData> teams = DataStore.teams;
        private HashSet<int> pressed = new HashSet<int>();
        private int rowPosition = 1;


        public GameWindow()
        {
            InitializeComponent();

            mpButton.Loaded += FreezeMiceAndMakeGrid;
            // All cursors are fixed to hover over mpButton. Handler determines which device clicked it
            mpButton.MultipointClick += MpButton_Click;
            mpButton.MultipointMouseRightButtonDownEvent += MpButton_RightButtonDown;

            // Set new handlers
            Server.Buzzer_OnRegister = new Progress<int>(buzzerId =>
            {
                // Ignore re-registration
            }) as IProgress<int>;

            Server.Buzzer_OnClick = new Progress<int>(buzzerId =>
            {
                RecordClick(buzzerId);
            }) as IProgress<int>;

            // KeyDown event configured in MainWindow.xaml.cs
        }


        #region Keydown event handlers
        // Remove all teams from screen
        public void Reset()
        {
            foreach (var border in grid.Children.OfType<Border>())
            {
                border.Background = grid.Background;
                var textblock = border.Child as TextBlock;
                textblock.Text = "";
            }

            pressed = new HashSet<int>();
            rowPosition = 1;
        }


        // Show all registered teams on screen
        public void ResetAndShowAll()
        {
            Reset();

            foreach (KeyValuePair<int, TeamData> entry in teams)
            {
                var teamId = entry.Key;

                DisplayTeam(teamId);
                pressed.Add(teamId);
            }
        }
        #endregion

        private void FreezeMiceAndMakeGrid(object sender, RoutedEventArgs e)
        {
            var btnPos = mpButton.PointToScreen(new Point(1, 1));
            int numMice = MultipointSdk.Instance.MouseDeviceList.Count;

            foreach (var deviceInfo in MultipointSdk.Instance.MouseDeviceList)
            {
                deviceInfo.DeviceVisual.CursorBitmap = CursorStore.BlankCursor;

                deviceInfo.DeviceVisual.SetPosition((int)btnPos.X, (int)btnPos.Y);
                deviceInfo.DeviceVisual.DisableMovement = true;
            }

            // Make grid with number of rows = number of mice registered
            MakeGrid(teams.Count);
        }

        #region Click handlers
        private void MpButton_Click(object sender, RoutedEventArgs e)
        {
            MultipointMouseEventArgs multipointargs = e as MultipointMouseEventArgs;
            RecordClick(multipointargs.DeviceInfo.Id);
        }

        private void RecordClick(int deviceId)
        {
            if (!pressed.Contains(deviceId))
            {
                DisplayTeam(deviceId);
                pressed.Add(deviceId);
            }
        }

        private void MpButton_RightButtonDown(object sender, RoutedEventArgs e)
        {
            MultipointMouseEventArgs multipointargs = e as MultipointMouseEventArgs;
            // If master mouse right-clicks, reset
            if (multipointargs.DeviceInfo.Id == DataStore.masterMouseID)
            {
                Reset();
            }
        }
        #endregion

        // Displays team on the next row
        // Only this function and Reset should mutate rowPosition
        private void DisplayTeam(int teamId)
        {
            // On backspace, teams dict is reset butthe handler is not removed. Buzzers that register after 
            // backspace still trigger handler  but are not present in teams dict, leading to an exception. 
            // Ignore click if not present in teams dict
            if (!teams.ContainsKey(teamId))
            {
                return;
            }

            TeamData teamData = teams[teamId];

            var border = GridUtil.GetUiElement<Border>(grid, rowPosition, 1);
            border.Background = teamData.Colour;
            
            // Write team's name on border
            var textblock = (TextBlock)border.Child;
            textblock.Text = teamData.Name;
            textblock.FontSize = border.ActualHeight / 4;

            // Increment rowPosition in preparation for next display
            rowPosition += 2;
        }


        // Create grid dynamically based on number of teams
        private void MakeGrid(int numRows)
        {
            grid.Background = new SolidColorBrush(Color.FromRgb(50, 50, 50));

            // Make columns
            var col1 = new ColumnDefinition();
            col1.Width = new GridLength(10, GridUnitType.Star);
            var col2 = new ColumnDefinition();
            col2.Width = new GridLength(80, GridUnitType.Star);
            var col3 = new ColumnDefinition();
            col3.Width = new GridLength(10, GridUnitType.Star);
            grid.ColumnDefinitions.Add(col1);
            grid.ColumnDefinitions.Add(col2);
            grid.ColumnDefinitions.Add(col3);

            double rowSize = 100.0 / numRows;
            double cardSize = 0.9 * rowSize;
            double spacerSize = 0.1 * rowSize;

            // Make top spacer row
            var topSpacerRow = new RowDefinition();
            topSpacerRow.Height = new GridLength(spacerSize, GridUnitType.Star);
            grid.RowDefinitions.Add(topSpacerRow);

            // Rows for teams
            for (int i = 0; i < numRows; i++)
            {
                var cardRow = new RowDefinition();
                cardRow.Height = new GridLength(cardSize, GridUnitType.Star);
                var spacerRow = new RowDefinition();
                spacerRow.Height = new GridLength(spacerSize, GridUnitType.Star);
                grid.RowDefinitions.Add(cardRow);
                grid.RowDefinitions.Add(spacerRow);

                // Add border to grid cell. Looks like a solid rectangle
                var border = new Border();
                border.Background = grid.Background;
                Grid.SetColumn(border, 1);
                Grid.SetRow(border, 2 * i + 1);
                grid.Children.Add(border);

                // Add textblock to border
                var text = new TextBlock();
                text.Text = "";

                text.FontFamily = FontStore.Arvo;
                text.HorizontalAlignment = HorizontalAlignment.Center;
                text.VerticalAlignment = VerticalAlignment.Center;
                border.Child = text;
            }
        }
    }
}
