const deepMerge = Npm.require('deepmerge');

SsrContext = class {
  constructor() {
    this._html = '';
    this._head = '';
    this._collections = {};
    this._redirectInfo = null;
  }

  getCollection(collName) {
    let collection = this._collections[collName];
    if (!collection) {
      const minimongo = Package.minimongo;
      collection = this._collections[collName] = new minimongo.LocalCollection();
    }

    return collection;
  }

  setHtml(html) {
    this._html = html;
  }

  getHtml() {
    return this._html;
  }

  addToHead(headHtml) {
    this._head += `\n${headHtml}`;
  }

  getHead() {
    return this._head;
  }

  redirect(url, statusCode = 302) {
    if(this._redirectInfo) {
      throw new Error(`Already redirected to: ${this._redirectInfo.url}`);
    }

    this._redirectInfo = {url, statusCode};
  }

  getRedirectInfo() {
    return _.clone(this._redirectInfo);
  }

  addSubscription(name, params) {
    const fastRenderContext = FastRender.frContext.get();
    if (!fastRenderContext) {
      throw new Error(
        `Cannot add a subscription: ${name} without FastRender Context`
      );
    }

    const args = [name].concat(params);
    const data = fastRenderContext.subscribe(...args);
    this.addData(data);
  }

  addData(data) {
    _.each(data, (collDataCollection, collectionName) => {
      const collection = this.getCollection(collectionName);
      collDataCollection.forEach((collData) => {
        collData.forEach((item) => {
          const existingDoc = collection.findOne(item._id);
          if (existingDoc) {
            const newDoc = deepMerge(existingDoc, item);
            delete newDoc._id;
            collection.update(item._id, newDoc);
          } else {
            collection.insert(item);
          }
        });
      });
    });
  }
};