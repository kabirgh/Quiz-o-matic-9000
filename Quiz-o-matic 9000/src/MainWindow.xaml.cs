using Microsoft.Multipoint.Sdk;
using Microsoft.Multipoint.Sdk.Controls;
using Quiz_o_matic_9000.src;
using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Shapes;

namespace Quiz_o_matic_9000
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        #region State variables
        private const int DATA_ROW_SIZE = 5;
        private const int SPACER_ROW_SIZE = 2;

        private const int FIRST_DATA_ROW = 5;
        private const int START_BTN_ROW = 20;

        private const int START_BTN_COL = 9;
        private const int DEL_BTN_COL = 1;
        private const int TEXTBOX_COL = 3;
        private const int COLOUR_SELECT_COL = 5;
        private const int REGISTER_BTN_COL = 7;

        private const int MAX_LAST_ACTIVE_ROW_POS = 23;
        private int lastActiveRowPosition = 5;

        // Row number: device ID
        private int[] deviceIds = new int[10] { -1, -1, -1, -1, -1, -1, -1, -1, -1, -1 };

        // Row number: fill of colour select button
        private Color[] rowColours = new Color[10];
        int lastUsedColourIndex = 0;

        // Colours already assigned to teams
        private HashSet<Color> coloursUsed = new HashSet<Color>();

        // Stores state of main window. When backspace is pressed, game screen reverts back to previous screen
        private object mainPageContent;
        private GameWindow gameWindow = new GameWindow();
        #endregion

        private enum RegisterButtonType { Register, Confirm };

        public MainWindow()
        {
            InitializeComponent();

            Loaded += MainWindow_Loaded;
            KeyDown += KeyDown_Event_Main;
            Closing += MainWindow_Closing;

            addButton.MultipointClick += AddButton_Click;

            deleteButton1.MultipointClick += DeleteButton_Click;

            textBox1.Loaded += TextBox_Loaded;

            colorSelectButton1.Loaded += ColourSelect_Loaded;
            colorSelectButton1.MultipointClick += ColourSelect_Click;

            registerMouseButton1.Loaded += RegisterButton_Loaded;
            registerMouseButton1.MultipointClick += RegisterButton_Click;

            startButton.Loaded += StartButton_Loaded;
            startButton.MultipointClick += StartButton_Click;

            var onRegister = new Progress<int>(buzzerId =>
            {
                Buzzer_OnRegister(buzzerId);
            }) as IProgress<int>;

            var onClick = new Progress<int>(buzzerId =>
            {
                // Ignore clicks
            }) as IProgress<int>;

            var onError = new Progress<string>(err =>
            {
                MessageBox.Show(err, "Press Esc to close this message box");
            }) as IProgress<string>;

            // Create websocket server in background thread. Background worker syncs with ui thread via handlers passed into method
            Server.Start(onRegister, onClick, onError);
        }

        private void MainWindow_Closing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            Server.Stop();
            MultipointSdk.Instance.Dispose();
        }

        private void Buzzer_OnRegister(int buzzerNumber)
        {
            if (Array.Exists(deviceIds, id => id == buzzerNumber))
            {
                var existingRowId = Array.IndexOf(deviceIds, buzzerNumber);
                var btnRow = MainPageUtil.RowIdToGridRow(existingRowId);
                var teamName = GridUtil.GetUiElement<MultipointTextBox>(mainWindowGrid, btnRow, TEXTBOX_COL).Text.Trim();
                teamName = (teamName == "") ? "<blank>" : teamName;

                MessageBox.Show($"Buzzer {buzzerNumber} is already registered for team {teamName} on row {existingRowId + 1}. " +
                                $"Please delete the row containing {teamName} if you want to register this buzzer for another team.",
                                 "Press Esc to close this message box");
                return;
            }

            int rowId = MainPageUtil.GridRowToId(GetNextRowPosition());
            // Record that buzzer is attached to this row
            deviceIds[rowId] = buzzerNumber;
            AddRow(RegisterButtonType.Confirm);
        }

        #region UI element loaded handlers
        private void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            titleBlock.FontFamily = FontStore.Arvo;
            titleBlock.VerticalAlignment = VerticalAlignment.Bottom;
            titleBlock.HorizontalAlignment = HorizontalAlignment.Left;
            titleBlock.FontSize = ((Border)titleBlock.Parent).ActualHeight / 2;

            MultipointSdk.Instance.Register(this);

            foreach (var deviceInfo in MultipointSdk.Instance.MouseDeviceList)
            {
                deviceInfo.DeviceVisual.CursorBitmap = CursorStore.DefaultCursor;
            }
        }

        private void TextBox_Loaded(object sender, RoutedEventArgs e)
        {
            var textbox = (MultipointTextBox)sender;
            textbox.VerticalContentAlignment = VerticalAlignment.Center;
            textbox.FontSize = textbox.ActualHeight / 2;
        }

        private void ColourSelect_Loaded(object sender, RoutedEventArgs e)
        {
            var colourSelect = (MultipointButton)sender;

            // Set team colour on first row colour select button
            var rect = new Rectangle();
            rect.Height = 20;
            rect.Width = 35;
            rect.Fill = DataStore.teamColours[0];
            rect.Stroke = new SolidColorBrush(Colors.Black);
            rect.StrokeThickness = 1;
            rect.Stretch = Stretch.Fill;

            rowColours[0] = DataStore.teamColours[0].Color;
            coloursUsed.Add(DataStore.teamColours[0].Color);

            colourSelect.Content = rect;
        }

        private void RegisterButton_Loaded(object sender, RoutedEventArgs e)
        {
            var textbox = (MultipointButton)sender;
            textbox.VerticalContentAlignment = VerticalAlignment.Center;
            textbox.FontSize = textbox.ActualHeight / 3;
        }

        private void StartButton_Loaded(object sender, RoutedEventArgs e)
        {
            var startBtn = (MultipointButton)sender;
            startBtn.FontSize = startBtn.ActualHeight / 3;
        }
        #endregion

        #region Keydown handlers
        public void KeyDown_Event_Main(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Escape)
            {
                Application.Current.Shutdown();
            }
        }
        
        private void KeyDown_Event_Game(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Escape)
            {
                Application.Current.Shutdown();
            }
            else if (e.Key == Key.R)
            {
                gameWindow.Reset();
            }
            else if (e.Key == Key.S)
            {
                gameWindow.ResetAndShowAll();
            }
            else if (e.Key == Key.Back)
            {
                foreach (var deviceInfo in MultipointSdk.Instance.MouseDeviceList)
                {
                    deviceInfo.DeviceVisual.DisableMovement = false;
                    deviceInfo.DeviceVisual.CursorBitmap = CursorStore.DefaultCursor;
                }

                Content = mainPageContent;

                // TODO: restore previous team colours
            }
        }
        #endregion

        #region Button click handlers and related methods
        private void AddButton_Click(object sender, RoutedEventArgs e)
        {
            // Button was clicked by mouse, not triggered by wireless connection. Allow mouse registration
            AddRow(RegisterButtonType.Register);
        }

        private void AddRow(RegisterButtonType btnType)
        {
            if (lastActiveRowPosition >= MAX_LAST_ACTIVE_ROW_POS)
            {
                return;
            }

            // Colour select button
            SolidColorBrush fill;
            try
            {
                fill = GetNextUnassignedColour();
            }
            // Should never happen since num colours > num teams
            catch (Exception exception)
            {
                MessageBox.Show(exception.Message, "Press Esc to close this message box");
                return;
            }

            lastActiveRowPosition += 2;

            var rect = new Rectangle();
            rect.Height = 20;
            rect.Width = 35;
            rect.Fill = fill;
            rect.Stroke = new SolidColorBrush(Colors.Black);
            rect.StrokeThickness = 1;
            rect.Stretch = Stretch.Fill;
            GridUtil.AttachMultipointButton(mainWindowGrid, lastActiveRowPosition, COLOUR_SELECT_COL, rect,
                clickHandler: ColourSelect_Click);
            coloursUsed.Add(fill.Color);
            rowColours[MainPageUtil.GridRowToId(lastActiveRowPosition)] = fill.Color;

            // Delete button
            var delIconPath = new Path();
            delIconPath.Data = (Geometry)FindResource("deleteIconGeometry");
            delIconPath.Fill = new SolidColorBrush(Colors.Red);
            delIconPath.Height = 25;
            delIconPath.Width = 25;
            delIconPath.Stretch = Stretch.Fill;
            GridUtil.AttachMultipointButton(mainWindowGrid, lastActiveRowPosition, DEL_BTN_COL, delIconPath,
                clickHandler: DeleteButton_Click);

            // Textbox
            GridUtil.AttachMultipointTextBox(mainWindowGrid, lastActiveRowPosition, TEXTBOX_COL,
                loadedHandler: TextBox_Loaded);

            if (btnType == RegisterButtonType.Register)
            {
                // Register mouse button
                GridUtil.AttachMultipointButton(mainWindowGrid, lastActiveRowPosition, REGISTER_BTN_COL, "Register mouse",
                     loadedHandler: RegisterButton_Loaded, clickHandler: RegisterButton_Click);
            }
            else if (btnType == RegisterButtonType.Confirm)
            {
                // Confirm team name for wireless device button
                GridUtil.AttachMultipointButton(mainWindowGrid, lastActiveRowPosition, REGISTER_BTN_COL, "Confirm",
                     loadedHandler: RegisterButton_Loaded, clickHandler: ConfirmButton_Click);
            }
            else
            {
                MessageBox.Show($"Invalid RegisterButtonType {btnType}", "Press Esc to close this message box");
            }
        }

        private void DeleteButton_Click(object sender, RoutedEventArgs e)
        {
            int btnRow = Grid.GetRow((MultipointButton)sender);
            int rowId = MainPageUtil.GridRowToId(btnRow);

            // Remove controls
            GridUtil.RemoveUiElement<MultipointButton>(mainWindowGrid, btnRow, DEL_BTN_COL);
            GridUtil.RemoveUiElement<MultipointTextBox>(mainWindowGrid, btnRow, TEXTBOX_COL);
            GridUtil.RemoveUiElement<MultipointButton>(mainWindowGrid, btnRow, REGISTER_BTN_COL);
            GridUtil.RemoveUiElement<MultipointButton>(mainWindowGrid, btnRow, COLOUR_SELECT_COL);

            // Shift controls up
            var elements = mainWindowGrid.Children;
            for (int i = 0; i < elements.Count; i++)
            {
                for (int row = btnRow + 2; row <= MAX_LAST_ACTIVE_ROW_POS; row += 2)
                {
                    if (Grid.GetRow(elements[i]) == row)
                    {
                        Control control = (Control)elements[i];
                        Grid.SetRow(control, row - 2);
                        break;
                    }
                }
            }

            DataStore.teams.Remove(deviceIds[MainPageUtil.GridRowToId(btnRow)]);
            Util.LeftShiftArray(deviceIds, rowId, -1);

            coloursUsed.Remove(rowColours[rowId]);
            Util.LeftShiftArray(rowColours, rowId, default(Color));

            lastActiveRowPosition -= 2;
        }

        private void ColourSelect_Click(object sender, RoutedEventArgs e)
        {
            SolidColorBrush fill;
            try
            {
                fill = GetNextUnassignedColour();
            }
            // Should never happen since num colours > num teams
            catch (Exception exception)
            {
                MessageBox.Show(exception.Message, "Press Esc to close this message box");
                return;
            }

            var btn = (MultipointButton)sender;
            var gridRow = Grid.GetRow(btn);
            var rowId = MainPageUtil.GridRowToId(gridRow);

            var colourSelectBtn = GridUtil.GetUiElement<MultipointButton>(mainWindowGrid, gridRow, COLOUR_SELECT_COL);

            var rect = (Rectangle)btn.Content;
            rect.Fill = fill;

            // Mark current fill as unused
            coloursUsed.Remove(rowColours[rowId]);

            // Mark new fill as used
            coloursUsed.Add(fill.Color);
            rowColours[rowId] = fill.Color;
        }

        // For wireless buzzer registration, buzzer is already assigned to row. Don't take
        // device id from mouse clicking the confirm button
        private void ConfirmButton_Click(object sender, RoutedEventArgs e)
        {
            int btnRow = Grid.GetRow((MultipointButton)sender);
            int rowId = MainPageUtil.GridRowToId(btnRow);
            // device id was saved to array when row was created
            int deviceId = deviceIds[rowId];

            var didSave = SaveTeam(deviceId, btnRow, rowId);

            if (didSave)
            {
                // Remove confirm button so user doesn't think device registration can be overriden
                GridUtil.RemoveUiElement<MultipointButton>(mainWindowGrid, btnRow, REGISTER_BTN_COL);
                // Lock team colour
                var colourSelect = GridUtil.GetUiElement<MultipointButton>(mainWindowGrid, btnRow, COLOUR_SELECT_COL);
                colourSelect.MultipointClick -= ColourSelect_Click;
            }
        }

        // Mouse registration
        private void RegisterButton_Click(object sender, RoutedEventArgs e)
        {
            int btnRow = Grid.GetRow((MultipointButton)sender);
            int rowId = MainPageUtil.GridRowToId(btnRow);
            int deviceId = ((MultipointMouseEventArgs)e).DeviceInfo.Id;

            // If mouse already registered for a different team
            if (DataStore.teams.ContainsKey(deviceId) && deviceIds[rowId] != deviceId)
            {
                MessageBox.Show("This mouse has already been assigned to team '" + DataStore.teams[deviceId].Name +
                    "'. Please delete the team entry before re-assigning this mouse.",
                    "Press Esc to close this message box");
            }
            else
            {
                SaveTeam(deviceId, btnRow, rowId);
            }
        }

        // Returns bool indicating whether error occurred or save was successful
        private bool SaveTeam(int deviceId, int btnRow, int rowId)
        {
            var textbox = GridUtil.GetUiElement<MultipointTextBox>(mainWindowGrid, btnRow, TEXTBOX_COL);
            if (textbox.Text.Trim() == "")
            {
                MessageBox.Show("Team name is invalid.", "Press Esc to close this message box");
                return false;
            }

            var colourSelectButton = GridUtil.GetUiElement<MultipointButton>(mainWindowGrid, btnRow, COLOUR_SELECT_COL);
            Rectangle rect = (Rectangle)colourSelectButton.Content;
            DataStore.teams[deviceId] = new TeamData(textbox.Text, (SolidColorBrush)rect.Fill);
            deviceIds[rowId] = deviceId;

            return true;
        }

        private void StartButton_Click(object sender, RoutedEventArgs e)
        {
            // No teams on screen
            if (lastActiveRowPosition < FIRST_DATA_ROW)
            {
                MessageBox.Show("At least 1 team is required.",
                    "Press Esc to close this message box");

                return;
            }

            for (int i = 0; i <= MainPageUtil.GridRowToId(lastActiveRowPosition); i++)
            {
                // Team has no registered mouse
                if (deviceIds[i] == -1)
                {
                    var textBox = GridUtil.GetUiElement<MultipointTextBox>(mainWindowGrid, MainPageUtil.RowIdToGridRow(i), TEXTBOX_COL);

                    MessageBox.Show("The team '" + textBox.Text +
                    "' at row " + (i + 1) + " does not have a mouse registered. Please register a mouse or delete the team before starting.",
                    "Press Esc to close this message box");

                    return;
                }
            }

            KeyDown -= KeyDown_Event_Main;
            KeyDown += KeyDown_Event_Game;
            gameWindow = new GameWindow();
            // Remember team entries
            mainPageContent = Content;
            Content = gameWindow.Content;
        }
        #endregion

        // Choose next colour not already assigned to a team
        private SolidColorBrush GetNextUnassignedColour()
        {
            int cachedIndex = lastUsedColourIndex;

            for (int i = cachedIndex; i < DataStore.teamColours.Length + cachedIndex; i++)
            {
                lastUsedColourIndex = (i + 1) % DataStore.teamColours.Length;
                if (!coloursUsed.Contains(DataStore.teamColours[lastUsedColourIndex].Color))
                {
                    return DataStore.teamColours[lastUsedColourIndex];
                }
            }

            throw new Exception("There aren't any colours left to assign to this team. Please delete another team before assigning a colour to this one");
        }

        // Returns -1 if no more valid row positions
        private int GetNextRowPosition()
        {
            return (lastActiveRowPosition >= MAX_LAST_ACTIVE_ROW_POS) ? -1 : lastActiveRowPosition + 2;
        }
    }
}