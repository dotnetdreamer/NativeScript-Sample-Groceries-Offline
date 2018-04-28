import { Injectable, ReflectiveInjector  } from "@angular/core";
import { AppSettings } from "./appSettings";

const SqLite = require('nativescript-sqlite');

export interface IDatabase {
    execSQL(sql, params?: Array<any>, callback?): Promise<any>
    get(sql, params?: Array<any>, callback?): Promise<any>
    all(sql, params?: Array<any>, callback?): Promise<Array<any>>
    isOpen(): Boolean
    close()
}

@Injectable()
export class DbService {
    constructor() {

    }

    getDatabase(): Promise<IDatabase> {
        return new Promise(async (resolve, reject) => {
            if(!SqLite.exists(AppSettings.DB_NAME)) {
                try {
                    const db: IDatabase = await new SqLite(AppSettings.DB_NAME);

                    const settingTablePromise = this.createSettingTable(db);

                    await Promise.all([settingTablePromise]);
                    resolve(db);
                } catch(e) {
                    reject(e);
                }
            } else {
                try {
                    const db: IDatabase = await new SqLite(AppSettings.DB_NAME);
                    resolve(db);
                } catch (e) {
                    reject(e);
                }
            }
        });
    }

    private createSettingTable(db: IDatabase) {
        return new Promise((resolve, reject) => {
            db.execSQL("CREATE TABLE IF NOT EXISTS setting (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT, value TEXT)")
            .then(id => {
                resolve(db);
            }, error => {
                reject(error);
            });        
        });
    }
}