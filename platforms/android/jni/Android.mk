LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE    := cheminot
LOCAL_SRC_FILES := cheminot.cpp

include $(BUILD_SHARED_LIBRARY)
