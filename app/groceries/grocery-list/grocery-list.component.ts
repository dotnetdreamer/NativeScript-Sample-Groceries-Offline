import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from "@angular/core";
import * as utils from "utils/utils";

import { Grocery, GroceryService } from "../shared";
import { alert } from "../../shared";

declare var UIColor: any;

@Component({
  selector: "gr-grocery-list",
  moduleId: module.id,
  templateUrl: "./grocery-list.component.html",
  styleUrls: ["./grocery-list.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GroceryListComponent {
  @Input() showDeleted: boolean;
  @Input() row;
  @Output() loading = new EventEmitter();
  @Output() loaded = new EventEmitter();

  public store: GroceryService;
  listLoaded = false;

  constructor(store: GroceryService) {
      this.store = store;
  }

  async load() {
    this.loading.next("");

    try {
      await this.store.load();

      this.loaded.next("");
      this.listLoaded = true;
    } catch (e) {
      alert("An error occurred loading your grocery list. " + e);
    }
    // this.store.load()
    //   .subscribe(
    //     () => {
    //       this.loaded.next("");
    //       this.listLoaded = true;
    //     },
    //     () => {
    //       alert("An error occurred loading your grocery list.");
    //     }
    //   );
  }

  // The following trick makes the background color of each cell
  // in the UITableView transparent as it’s created.
  makeBackgroundTransparent(args) {
    let cell = args.ios;
    if (cell) {
      // support XCode 8
      cell.backgroundColor = utils.ios.getter(UIColor, UIColor.clearColor);
    }
  }

  imageSource(grocery) {
    if (grocery.deleted) {
      return "res://add";
    }
    return grocery.done ? "res://checked" : "res://unchecked";
  }

  async toggleDone(grocery: Grocery) {
    try {
      if (grocery.deleted) {
          await this.store.unsetDeleteFlag(grocery)
      } else {
        await this.store.toggleDoneFlag(grocery);
      }
    } catch (e) {
      alert("An error occurred managing your grocery list. " + e);
    }
  }

  delete(grocery: Grocery) {
    this.loading.next("");
    let successHandler = () => this.loaded.next("");
    let errorHandler = () => {
      alert("An error occurred while deleting an item from your list.");
      this.loaded.next("");
    };

    if (grocery.deleted) {
      this.store.permanentlyDelete(grocery)
        .then(successHandler, errorHandler);
    } else {
      this.store.setDeleteFlag(grocery)
        .then(successHandler, errorHandler);
    }
  }
}

