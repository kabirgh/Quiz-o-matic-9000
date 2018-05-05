using System;
using System.Drawing;
using System.IO;

namespace Quiz_o_matic_9000.src
{
    class CursorStore
    {
        public static readonly Bitmap BlankCursor;
        public static readonly Bitmap DefaultCursor;

        static CursorStore()
        {
            BlankCursor = new Bitmap(Properties.Resources.blank_cursor);
            DefaultCursor = new Bitmap(Properties.Resources.default_cursor);
        }
    }
}
