export function home() {
  return '/';
}

export function departures(startId: string, endId: string, at: number) {
  return '/departures/' + startId + '/' + endId + '/' + at;
}

export function trip(startId: string, endId: string, departureTime: Date) {
  return ['/trip', startId, endId, departureTime.getTime()].join('/');
}

export function matchHome(route: string) {
  return route == home();
}

export function matchDepartures(route: string) {
  return /\/departures\/.+/.test(route);
}

export function matchTrip(route: string) {
  return /\/trip\/.+/.test(route);
}
