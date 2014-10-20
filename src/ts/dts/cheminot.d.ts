interface Departure {
  startTime: Date;
  endTime: Date;
  nbSteps: number;
  id: () => string;
}

declare module cordova {

  var isMock: boolean;

  module plugins {
    module SoftKeyboard {
      function show(success: () => void, error: () => void): void;
      function hide(success: () => void, error: () => void): void;
    }

    module Cheminot {
      function init(success: (version: string) => void, error: () => void): void;
      function lookForBestTrip(start: string, end: string, at: number, success: (departure: Departure) => void, error: () => void): void;
    }
  }
}
