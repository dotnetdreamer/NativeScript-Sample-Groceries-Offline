import { Injectable, NgZone } from "@angular/core";
import { Http, Headers, Response, ResponseOptions, URLSearchParams } from "@angular/http";
import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import "rxjs/add/operator/map";

import { BackendService } from "../../shared";
import { Grocery } from "./grocery.model";
import { DbService } from "../../shared/db.service";

@Injectable()
export class GroceryService {
  items: BehaviorSubject<Array<Grocery>> = new BehaviorSubject([]);
  private allItems: Array<Grocery> = [];
  baseUrl = BackendService.baseUrl + "appdata/" + BackendService.appKey + "/Groceries";

  private _TABLE_NAME = "grocery";

  constructor(private http: Http, private zone: NgZone, 
  private dbService: DbService) { }

  createSchema(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const db = await this.dbService.getDatabase();
      let sql = `CREATE TABLE IF NOT EXISTS ${this._TABLE_NAME} (`;
      sql += "id INTEGER PRIMARY KEY AUTOINCREMENT" 
      sql += ", name TEXT, done INTEGER, deleted INTEGER";
      sql += ")";

      try {
        const id = await db.execSQL(sql);
        resolve();
      } catch (e) {
        reject('Couldnot create table grocery: ' + e);
      }
    });
  }

  load() {
    return new Promise(async (resolve, reject) => {
      const db = await this.dbService.getDatabase();
      if(!db.isOpen()) {
        reject('Couldnot open database');
        return;
      }

      let sql = `SELECT * FROM ${this._TABLE_NAME}`;
      try { 
        const resultSet = await db.all(sql, []);
        db.close();

        const data = this.mapDataAll(resultSet);
        data.forEach((grocery) => {
          this.allItems.push(
            new Grocery(
              grocery.id,
              grocery.name,
              grocery.done || false,
              grocery.deleted || false
            )
          );
          this.publishUpdates();
        });
        resolve(data);
      } catch (e) {
        reject(e);
      }
    });
  }

  add(name: string) {
    return new Promise(async (resolve, reject) => {
      const db = await this.dbService.getDatabase();
      if(!db.isOpen()) {
        reject('Couldnot open database');
        return;
      }

      let sql = `INSERT INTO ${this._TABLE_NAME} `;
      sql += "(name, done, deleted) values (?, ?, ?)";

      try {
        const id = await db.execSQL(sql, [name, 0, 0]);
        db.close();

        this.allItems.unshift(new Grocery(id, name, false, false));
        this.publishUpdates();

        resolve(id);
      } catch (e) {
        reject('Couldnot insert grocery: ' + e);
      }
    });
  }

  setDeleteFlag(item: Grocery) {    
    return new Promise(async (resolve, reject) => {
      const db = await this.dbService.getDatabase();
      if(!db.isOpen()) {
        reject('Couldnot open database');
        return;
      }

      let sql = `UPDATE ${this._TABLE_NAME} SET deleted = 1 `;
      sql += "WHERE id = ?";

      try {
        const numOfAffectedRows = await db.execSQL(sql, [item.id]); 
        if(numOfAffectedRows > 0) {
          item.deleted = true;

          item.done = false;
          this.publishUpdates();
        }
        resolve();
      } catch (e) {
        reject(e);
      }        
   }); 
  }

  unsetDeleteFlag(item: Grocery) {
    return new Promise(async (resolve, reject) => {
      const db = await this.dbService.getDatabase();
      if(!db.isOpen()) {
        reject('Couldnot open database');
        return;
      }

      let sql = `UPDATE ${this._TABLE_NAME} SET deleted = 0 `;
      sql += "WHERE id = ?";

      try {
        const numOfAffectedRows = await db.execSQL(sql, [item.id]); 
        if(numOfAffectedRows > 0) {
          item.deleted = false;
          item.done = false;
          this.publishUpdates();
        }

        resolve();
      } catch (e) {
        reject(e);
      }        
   }); 
  }


  toggleDoneFlag(item: Grocery) {
    item.done = !item.done;

    return new Promise(async (resolve, reject) => {
      const db = await this.dbService.getDatabase();
      if(!db.isOpen()) {
        reject('Couldnot open database');
        return;
      }

      let sql = `UPDATE ${this._TABLE_NAME} SET done = ? `;
      sql += "WHERE id = ?";

      try {
        const result = await db.execSQL(sql, [item.done ? 1 : 0, item.id]); 
        this.publishUpdates();

        resolve();
      } catch (e) {
        reject(e);
      }        
   });
  }

  permanentlyDelete(item: Grocery) {
    return new Promise(async (resolve, reject) => {
      const db = await this.dbService.getDatabase();
      if(!db.isOpen()) {
        reject('Couldnot open database');
        return;
      }

      let sql = `DELETE FROM ${this._TABLE_NAME} `;
      sql += "WHERE id = ?";

      try {
        const result = await db.execSQL(sql, [item.id]); 

        let index = this.allItems.indexOf(item);
        this.allItems.splice(index, 1);
        this.publishUpdates();

        resolve();
      } catch (e) {
        reject(e);
      }        
   }); 
  }

  private mapDataAll(resultSet): Array<Grocery> {
      let data = [];
      for(let result of resultSet) {
        data.push(this.mapData(result));
      }
      return data;
  }

  private mapData(data): Grocery {
    let dataItem: Grocery = {
          id: data[0],
          name: data[1],
          deleted: data[2],
          done: data[3]
      };
      return dataItem;
  }

  private put(grocery: Grocery) {
    return this.http.put(
      this.baseUrl + "/" + grocery.id,
      JSON.stringify({
        Name: grocery.name,
        Done: grocery.done,
        Deleted: grocery.deleted
      }),
      { headers: this.getCommonHeaders() }
    )
    .catch(this.handleErrors);
  }

  private publishUpdates() {
    // Make sure all updates are published inside NgZone so that change detection is triggered if needed
    this.zone.run(() => {
      // must emit a *new* value (immutability!)
      this.items.next([...this.allItems]);
    });
  }

  private getCommonHeaders() {
    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Authorization", "Kinvey " + BackendService.token);
    return headers;
  }

  private handleErrors(error: Response) {
    console.log(error);
    return Observable.throw(error);
  }
}