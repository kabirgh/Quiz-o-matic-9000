
namespace Quiz_o_matic_9000.src
{
    class Util : MainWindow
    {
        public static void FillArray<T>(T[] array, T value)
        {
            for (int i = 0; i < array.Length; i++)
            {
                array[i] = value;
            }
        }

        public static void LeftShiftArray<T>(T[] array, int startIdx, int shift, T endVal)
        {
            int length = array.Length;

            for (int i = startIdx; i < length - shift; i++)
            {
                array[i] = array[ (i + shift) % length];
            }
            for (int i = length - shift; i < length; i++)
            {
                array[i] = endVal;
            }
        }
    }
}
