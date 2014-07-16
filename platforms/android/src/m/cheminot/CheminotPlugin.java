package m.cheminot;

import java.io.IOException;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;

import android.app.Activity;
import android.content.Context;
import android.content.res.AssetManager;

public class CheminotPlugin extends CordovaPlugin {

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext cbc) {
        try {
            Activity activity = this.cordova.getActivity();
            Context ctx = activity.getApplicationContext();
            AssetManager assetManager = ctx.getAssets();
            String[] dbPath = assetManager.list("db");
            cbc.success(dbPath[0]);
            //SQLiteDatabase db = SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READONLY);
            //System.out.println(db);
        } catch (IOException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
        return true;
    }
}
