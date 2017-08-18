/**
 * Convert a `File` object returned by the upload input into
 * a base 64 string. That's easier to use on FakeRest, used on
 * the ng-admin example. But that's probably not the most optimized
 * way to do in a production database.
 */
const convertFileToBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
});

/**
* For create and update only, convert uploaded image in base 64 and attach it to
* the `base64` sent property.
*/
const addUploadFeature = requestHandler => (type, resource, params) => {

  if (type === 'UPDATE' || type ==='CREATE') {
    let dataWithConverted = {};
    let convertion = [];
    for (let dataKey in params.data) {
      let d = params.data[dataKey];
      if (Array.isArray(d) && d.length && d.filter(v => v instanceof File).length) {
        let convert = d.map( v => {
          if (v instanceof File) {
            return convertFileToBase64(v).then( base64 => ({base64}) );
          } else {
            return Promise.resolve(v);
          }
        });
        convertion.push( Promise.all(convert).then( a => dataWithConverted[dataKey] = a) );
      }
    }
    return Promise.all(convertion)
      .then( ()=> requestHandler(type, resource, {
        ...params,
        data: {
          ...params.data,
          ...dataWithConverted
        },
      }) );
  }
  return requestHandler(type, resource, params);
};

export default addUploadFeature;
