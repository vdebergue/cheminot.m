/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
 */

package io.cheminot.m;

import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.FileOutputStream;
import android.os.Bundle;
import org.apache.cordova.*;

public class cheminotm extends CordovaActivity
{
    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        super.init();
        try {
            this.initDatabase();
        } catch (Exception e) {
            e.printStackTrace();
        }
        // Set by <content src="index.html" /> in config.xml
        super.loadUrl(Config.getStartUrl());
        //super.loadUrl("file:///android_asset/www/index.html")
    }

    private void initDatabase() throws java.io.IOException
    {
        this.copyDbFile("cheminot.db", "db/", "");
    }

    private void copyDbFile(String dbFileName, String sourceDir, String outputDir) throws java.io.IOException
    {
        File dbFile = getDatabasePath(dbFileName);
        if(!dbFile.exists()){
            File dbDirectory = new File(dbFile.getParent());
            dbDirectory.mkdirs();
            InputStream in = this.getApplicationContext().getAssets().open(sourceDir + dbFileName);
            OutputStream out = new FileOutputStream(new File(dbDirectory.getAbsolutePath() + "/" + outputDir + dbFileName));
            byte[] buf = new byte[1024];
            int len;
            while ((len = in.read(buf)) > 0) {
                out.write(buf, 0, len);
            }
            in.close();
            out.close();
        }
    }
}

