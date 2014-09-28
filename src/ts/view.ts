export interface Attributes {
    [index: string]: string;
}

export function handleAttributes(attributes: Attributes, validate: (name: string, value: string) => boolean): Attributes {
  for(var key in attributes) {
    var values = attributes[key].split(' ');
    attributes[key] = values.filter(value => validate(key, value)).join(' ');
  }
  return attributes;
}
