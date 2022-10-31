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
export class {{contract_name_pascal}} {
  flag: bool;
  constructor(flag: bool = false) {
    this.flag = flag;
  }
}

@contract
export class Contract {
  _data: Pack<{{contract_name_pascal}}>;

  constructor() {
    this._data = instantiate<Pack<{{contract_name_pascal}}>>(new {{contract_name_pascal}}(false));
  }

  get data(): {{contract_name_pascal}} {
    return this._data.unwrap();
  }

  set data(data: {{contract_name_pascal}}) {
    this._data = new Pack(data);
  }

  @constructor()
  new(flag: bool): void {
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
