using System;
using System.IO;

namespace Quiz_o_matic_9000.src
{
    class CursorStore
    {
        public static readonly string PathToBlankCursor;
        public static readonly string PathToDefaultCursor;

        static CursorStore()
        {
            string currentDirectory = Path.GetDirectoryName(AppDomain.CurrentDomain.BaseDirectory);
            PathToBlankCursor = Path.GetFullPath(Path.Combine(currentDirectory, @"..\..\img\blank_cursor.jpg"));
            PathToDefaultCursor = Path.GetFullPath(Path.Combine(currentDirectory, @"..\..\img\default_cursor.png"));
        }
    }
}
