declare module cordova {
  module plugins {
    module SoftKeyboard {
      function show(success: () => void, error: () => void): Q.Promise<void>;
      function hide(success: () => void, error: () => void): Q.Promise<void>;
    }

    module Cheminot {
    }
  }
}
