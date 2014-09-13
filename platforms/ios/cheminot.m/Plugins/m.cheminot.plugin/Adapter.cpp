#include <stdio.h>
#include <stdlib.h>
#include <sqlite3.h>

char *version = NULL;

const char* getVersion(const char *dbpath) {
  int retval;
  sqlite3 *handle;
  sqlite3_stmt *stmt;
  const char *result = "";
  if(version == NULL) {
    fprintf(stderr, "NOT FROM CACHE");
    sqlite3_open_v2(dbpath, &handle, SQLITE_OPEN_READONLY, NULL);
    sqlite3_prepare_v2(handle, "SELECT value FROM cache WHERE KEY = 'version';",-1, &stmt, 0);
    sqlite3_column_count(stmt);
    retval = sqlite3_step(stmt);
    if(retval == SQLITE_ROW) {
      result = (const char *)sqlite3_column_text(stmt, 0);
      version = (char*) result;
    }
    sqlite3_close(handle);
  } else {
    fprintf(stderr, "FROM CACHE %s", version);
    version = (char*) result;
  }
  return result;
}
