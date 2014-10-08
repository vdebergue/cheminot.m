declare module cordova {

  var isMock: boolean;

  module plugins {
    module SoftKeyboard {
      function show(success: () => void, error: () => void): Q.Promise<void>;
      function hide(success: () => void, error: () => void): Q.Promise<void>;
    }

    module Cheminot {
    }
  }
}

declare module Splashscreen {
  function show(): void;
  function hide(): void;
}
