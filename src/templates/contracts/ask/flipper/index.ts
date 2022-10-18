/* eslint-disable @typescript-eslint/no-inferrable-types */
import { env, Pack } from "ask-lang";

@event({ id: 1 })
export class FlipEvent {
  flag: bool;

  constructor(flag: bool) {
    this.flag = flag;
  }
}

@spreadLayout
@packedLayout
export class Flipper {
  flag: bool;
  constructor(flag: bool = false) {
    this.flag = flag;
  }
}

@contract
export class Contract {
  _data: Pack<Flipper>;

  constructor() {
    this._data = instantiate<Pack<Flipper>>(new Flipper(false));
  }

  get data(): Flipper {
    return this._data.unwrap();
  }

  set data(data: Flipper) {
    this._data = new Pack(data);
  }

  @constructor()
  default(flag: bool): void {
    this.data.flag = flag;
  }

  @message({ mutates: true })
  flip(): void {
    this.data.flag = !this.data.flag;
    let event = new FlipEvent(this.data.flag);
    // @ts-ignore
    env().emitEvent(event);
  }

  @message()
  get(): bool {
    return this.data.flag;
  }
}
