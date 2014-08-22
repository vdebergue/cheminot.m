#include <jni.h>
#include <android/log.h>
#include <stdio.h>
#include <stdlib.h>
#include <sqlite3.h>
#include <string>

void toto(const char *dbpath) {
  int retval;
  sqlite3 *handle;
  sqlite3_stmt *stmt;
  std::string result = "";

  sqlite3_open_v2(dbpath, &handle, SQLITE_OPEN_READONLY, NULL);
  sqlite3_prepare_v2(handle, "SELECT * FROM CACHE;",-1, &stmt, 0);
  int cols = sqlite3_column_count(stmt);

  while(1) {
    retval = sqlite3_step(stmt);
    if(retval == SQLITE_ROW) {
       for(int col=0 ; col<cols; col++) {
         const char *r = (const char*)sqlite3_column_text(stmt, col);
       }
    } else {
       break;
    }
  }
  sqlite3_close(handle);
}

extern "C" {
  JNIEXPORT jstring JNICALL Java_m_cheminot_plugin_jni_CheminotLib_f(JNIEnv *env, jobject obj, jstring dbpath);
};

JNIEXPORT jstring JNICALL Java_m_cheminot_plugin_jni_CheminotLib_f(JNIEnv *env, jobject obj, jstring dbpath) {
  jboolean isCopy;
  const char *path = env->GetStringUTFChars(dbpath, &isCopy);
  toto(path);
  return dbpath;
}
