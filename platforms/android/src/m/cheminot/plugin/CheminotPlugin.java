package m.cheminot.plugin;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;

import android.database.sqlite.SQLiteDatabase;

public class CheminotPlugin extends CordovaPlugin {

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext cbc) {
        String dbPath = this.cordova.getActivity().getDatabasePath("cheminot.db").getAbsolutePath();
        cbc.success(dbPath);
        SQLiteDatabase db = SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READONLY);
        db.execSQL("SELECT * FROM TRIPS");
        System.out.println(db);
        return true;
    }
}
