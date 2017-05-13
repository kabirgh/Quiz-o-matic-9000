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

        // Row number: mouse ID
        private int[] mouseIds = new int[10];

        // Row number: fill of colour select button
        private Color[] rowColours = new Color[10];
        int lastUsedColourIndex = 0;

        // Colours already assigned to teams
        private HashSet<Color> coloursUsed = new HashSet<Color>();

        // Stores state of main window. When backspace is pressed, game screen reverts back to previous screen
        private object mainPageContent;
        private GameWindow gameWindow = new GameWindow();


        public MainWindow()
        {
            InitializeComponent();

            Util.FillArray(mouseIds, -1);

            Loaded += MainWindow_Loaded;
            KeyDown += KeyDown_Event_Main;

            addButton.MultipointClick += AddButton_Click;

            deleteButton1.MultipointClick += DeleteButton_Click;

            textBox1.Loaded += TextBox_Loaded;

            colorSelectButton1.Loaded += ColourSelect_Loaded;
            colorSelectButton1.MultipointClick += ColourSelect_Click;

            registerMouseButton1.Loaded += RegisterButton_Loaded;
            registerMouseButton1.MultipointClick += RegisterButton_Click;

            startButton.Loaded += StartButton_Loaded;
            startButton.MultipointClick += StartButton_Click;
        }


        private void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            titleBlock.FontFamily = FontStore.Arvo;
            titleBlock.VerticalAlignment = VerticalAlignment.Bottom;
            titleBlock.HorizontalAlignment = HorizontalAlignment.Left;
            titleBlock.FontSize = ((Border)titleBlock.Parent).ActualHeight / 2;

            MultipointSdk.Instance.Register(this);

            foreach (var deviceInfo in MultipointSdk.Instance.MouseDeviceList)
            {
                deviceInfo.DeviceVisual.CursorBitmap = new System.Drawing.Bitmap(CursorStore.PathToDefaultCursor);
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


        public void KeyDown_Event_Main(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Escape)
            {
                MultipointSdk.Instance.Dispose();
                Application.Current.Shutdown();
            }
        }
        
        private void KeyDown_Event_Game(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Escape)
            {
                MultipointSdk.Instance.Dispose();
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
                    deviceInfo.DeviceVisual.CursorBitmap = new System.Drawing.Bitmap(CursorStore.PathToDefaultCursor);
                }

                Content = mainPageContent;
            }
        }


        private void AddButton_Click(object sender, RoutedEventArgs e)
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

            // Register mouse button
            GridUtil.AttachMultipointButton(mainWindowGrid, lastActiveRowPosition, REGISTER_BTN_COL, "Register mouse",
                 loadedHandler: RegisterButton_Loaded, clickHandler: RegisterButton_Click);
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
            // TODO: find faster solution
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

            DataStore.teams.Remove(mouseIds[MainPageUtil.GridRowToId(btnRow)]);
            Util.LeftShiftArray(mouseIds, rowId, 1, -1);

            coloursUsed.Remove(rowColours[rowId]);
            Util.LeftShiftArray(rowColours, rowId, 1, default(Color));

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
            

        private void RegisterButton_Click(object sender, RoutedEventArgs e)
        {
            MultipointButton btn = (MultipointButton)sender;
            int btnRow = Grid.GetRow(btn);
            int rowId = MainPageUtil.GridRowToId(btnRow);
            int deviceId = ((MultipointMouseEventArgs)e).DeviceInfo.Id;

            var textbox = GridUtil.GetUiElement<MultipointTextBox>(mainWindowGrid, Grid.GetRow(btn), TEXTBOX_COL);

            // If mouse already registered for a different team
            if (DataStore.teams.ContainsKey(deviceId) && mouseIds[rowId] != deviceId)
            {
                MessageBox.Show("This mouse has already been assigned to team '" + DataStore.teams[deviceId].Name +
                    "'. Please delete the team entry before re-assigning this mouse.",
                    "Press Esc to close this message box");
            }
            else if (textbox.Text.Trim() == "")
            {
                MessageBox.Show("Team name is invalid.",
                    "Press Esc to close this message box");
            }
            else
            {
                var colourSelectButton = GridUtil.GetUiElement<MultipointButton>(mainWindowGrid, btnRow, COLOUR_SELECT_COL);
                Rectangle rect = (Rectangle)colourSelectButton.Content;
                DataStore.teams[deviceId] = new TeamData(textbox.Text, (SolidColorBrush)rect.Fill);
                mouseIds[rowId] = deviceId;
            }
        }


        private void StartButton_Click(object sender, RoutedEventArgs e)
        {
            // No teams on screen
            if (lastActiveRowPosition < FIRST_DATA_ROW + 2)
            {
                MessageBox.Show("A minimum of two teams are required.",
                    "Press Esc to close this message box");

                return;
            }

            for (int i = 0; i <= MainPageUtil.GridRowToId(lastActiveRowPosition); i++)
            {
                // Team has no registered mouse
                if (mouseIds[i] == -1)
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

    }
}