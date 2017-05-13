using System;
using System.IO;
using System.Linq;
using System.Windows.Media;

namespace Quiz_o_matic_9000.src
{
    class FontStore
    {
        // Fonts
        public static readonly FontFamily Arvo;

        static FontStore()
        {
            string currentDirectory = Path.GetDirectoryName(AppDomain.CurrentDomain.BaseDirectory);
            string pathToArvo = Path.GetFullPath(Path.Combine(currentDirectory, @"..\..\fonts\"));
            Arvo = Fonts.GetFontFamilies(new Uri(pathToArvo)).First();
        }
    }
}
