
namespace Quiz_o_matic_9000.src
{
    class MainPageUtil : MainWindow
    {

        public static int GridRowToId(int gridRow)
        {
            return (gridRow / 2) - 2;
        }

        public static int RowIdToGridRow(int rowId)
        {
            return ((rowId + 2) * 2) + 1;
        }
    }
}
