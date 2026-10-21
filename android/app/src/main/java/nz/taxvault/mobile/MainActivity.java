package nz.taxvault.mobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Do NOT request permissions on cold app launch.
        // Permissions are requested just-in-time when user initiates camera scanning.
    }
}
