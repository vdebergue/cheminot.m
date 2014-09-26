export function home() {
  return '/';
}

export function departures() {
  return '/departures';
}

export function trip(id: string) {
  return '/trip/' + id;
}

export function matchHome(route: string) {
  return route == home();
}

export function matchDepartures(route: string) {
  return route == departures();
}

export function matchTrip(route: string) {
  return/\/trip\/.+/.test(route);
}
