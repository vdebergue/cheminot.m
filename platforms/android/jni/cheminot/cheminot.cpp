#include <jni.h>
#include <android/log.h>
#include <stdio.h>
#include <stdlib.h>
#include <sqlite3.h>

const char* getVersion(const char *dbpath) {
  int retval;
  sqlite3 *handle;
  sqlite3_stmt *stmt;
  const char *result = "";

  sqlite3_open_v2(dbpath, &handle, SQLITE_OPEN_READONLY, NULL);
  sqlite3_prepare_v2(handle, "SELECT value FROM cache WHERE KEY = 'version';",-1, &stmt, 0);
  sqlite3_column_count(stmt);
  retval = sqlite3_step(stmt);
  if(retval == SQLITE_ROW) {
    result = (const char *)sqlite3_column_text(stmt, 0);
  }
  sqlite3_close(handle);
  return result;
}

extern "C" {
  JNIEXPORT jstring JNICALL Java_m_cheminot_plugin_jni_CheminotLib_f(JNIEnv *env, jobject obj, jstring dbpath);
};

JNIEXPORT jstring JNICALL Java_m_cheminot_plugin_jni_CheminotLib_f(JNIEnv *env, jobject obj, jstring dbpath) {
  const char *path = env->GetStringUTFChars(dbpath, (jboolean *)0);
  const char *result = getVersion(path);
  __android_log_print(ANDROID_LOG_DEBUG, "CheminotLog", "RESULTS %s", result);
  env->ReleaseStringUTFChars(dbpath, path);
  return env->NewStringUTF(result);
}
