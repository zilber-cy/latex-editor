package uk.ac.ic.wlgitbridge.util;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

/**
 * Created by winston on 23/08/2016.
 */
public class TimerUtilsTest {

    @Test
    public void testMakeTimerTask() {
        int[] iPtr = new int[] { 3 };
        TimerUtils.makeTimerTask(() -> iPtr[0] = 5).run();
        assertEquals(5, iPtr[0]);
    }

}
