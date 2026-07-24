declare module 'all-the-cities' {
  interface City {
    cityId: string;
    name: string;
    country: string;
    altCountry: string;
    muni: string;
    muniSub: string;
    featureClass: string;
    featureCode: string;
    adminCode: string;
    population: number;
    loc: { type: 'Point'; coordinates: [number, number] };
  }
  const cities: City[];
  export default cities;
}
