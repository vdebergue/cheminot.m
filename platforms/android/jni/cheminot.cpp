#include <jni.h>
#include <android/log.h>
#include <stdio.h>
#include <stdlib.h>


extern "C" {
  JNIEXPORT jstring JNICALL Java_m_cheminot_plugin_jni_CheminotLib_f(JNIEnv * env, jobject obj, jstring db_path);
};

JNIEXPORT jstring JNICALL Java_m_cheminot_plugin_jni_CheminotLib_f(JNIEnv * env, jobject obj, jstring db_path)
{
  return db_path;
}
