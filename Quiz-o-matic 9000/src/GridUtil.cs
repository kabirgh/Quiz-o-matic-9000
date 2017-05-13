using Microsoft.Multipoint.Sdk.Controls;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace Quiz_o_matic_9000.src
{
    class GridUtil
    {
        private void defaultRoutedEventHandler(object sender, RoutedEventArgs e) { }
        
        // Assumption: only one element per grid cell
        // Iterates through grid children to find element that matches row and column
        public static T GetUiElement<T>(Grid grid, int row, int col) where T : UIElement
        {
            return grid.Children
               .OfType<T>()
               .First(elem => Grid.GetRow(elem) == row && Grid.GetColumn(elem) == col);
        }

        // Assumption: only one element of type T per grid cell
        public static void RemoveUiElement<T>(Grid grid, int row, int col) where T : UIElement
        {
            var elem = GetUiElement<T>(grid, row, col);
            grid.Children.Remove(elem);
        }


        public static void AttachMultipointTextBox(Grid grid, int row, int col, 
            RoutedEventHandler loadedHandler = null)
        {
            // Add entry textbox
            var mpTextBox = new MultipointTextBox();
            mpTextBox.Background = new SolidColorBrush(Colors.White);
            Grid.SetColumn(mpTextBox, col);
            Grid.SetRow(mpTextBox, row);
            grid.Children.Add(mpTextBox);
            if (loadedHandler != null)
            {
                mpTextBox.Loaded += loadedHandler;
            }
        }

        public static void AttachMultipointButton(Grid grid, int row, int col, object content, 
            RoutedEventHandler loadedHandler = null, 
            RoutedEventHandler clickHandler = null)
        {
            var btn = new MultipointButton();
            btn.Content = content;
            Grid.SetColumn(btn, col);
            Grid.SetRow(btn, row);
            grid.Children.Add(btn);
            if (loadedHandler != null)
            {
                btn.Loaded += loadedHandler;
            }
            if (clickHandler != null)
            {
                btn.MultipointClick += clickHandler;
            }
        }
    }
}
