using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Quiz_o_matic_9000.src
{
    class Util
    {
        public static void LeftShiftArray<T>(T[] array, int startIdx, T defaultVal)
        {
            for (int i = startIdx; i < array.Length - 1; i++)
            {
                array[i] = array[i + 1];
            }
            array[array.Length - 1] = defaultVal;
        }
    }
}
