import { env, u128, Lazy, AccountId, ZERO_ACCOUNT, Mapping, HashKeccak256, Pack } from "ask-lang";

@spreadLayout
@packedLayout
class Constants {
  _name: string = "";
  _symbol: string = "";
  _decimal: u8 = 0;
}
@spreadLayout
class ERC20Storage {
  balances: Mapping<AccountId, u128, HashKeccak256> = new Mapping();
  // Note: Account in Map's key is ref, so we should use string.
  allowances: Mapping<AccountId, Map<string, u128>, HashKeccak256> = new Mapping();

  _totalSupply: Lazy<u128> = instantiate<Lazy<u128>>();
  constants: Pack<Constants> = instantiate<Pack<Constants>>();
}
@event({ id: 1 })
class Transfer {
  from: AccountId;
  to: AccountId;

  value: u128;

  constructor(from: AccountId, to: AccountId, value: u128) {
    this.from = from;
    this.to = to;
    this.value = value;
  }
}
@event({ id: 2 })
class Approval {
  owner: AccountId;
  spender: AccountId;

  value: u128;

  constructor(owner: AccountId, spender: AccountId, value: u128) {
    this.owner = owner;
    this.spender = spender;
    this.value = value;
  }
}
@contract
export class ERC20 {
  private storage: ERC20Storage;

  constructor() {
    this.storage = new ERC20Storage();
  }

  @constructor()
  default(name: string, symbol: string): void {
    this.storage.constants.unwrap()._name = name;
    this.storage.constants.unwrap()._symbol = symbol;
    this.storage.constants.unwrap()._decimal = 18;
    this.storage._totalSupply.set(u128.Zero);
  }

  @message()
  name(): string {
    return this.storage.constants.unwrap()._name;
  }

  @message()
  symbol(): string {
    return this.storage.constants.unwrap()._symbol;
  }

  @message()
  decimal(): u8 {
    return this.storage.constants.unwrap()._decimal;
  }

  @message()
  totalSupply(): u128 {
    return this.storage._totalSupply.get();
  }

  @message()
  balanceOf(account: AccountId): u128 {
    const res = this.storage.balances.getOrNull(account);
    if (res) {
      return res as u128;
    }
    // @ts-ignore
    return u128.Zero;
  }

  @message({ mutates: true })
  transfer(recipient: AccountId, amount: u128): bool {
    const caller = env().caller<AccountId>();
    return this._transfer(caller, recipient, amount);
  }

  @message()
  allowance(owner: AccountId, spender: AccountId): u128 {
    const allowance = this.storage.allowances.getOrNull(owner);
    const spenderId = spender.toString();
    if (!allowance || !allowance.has(spenderId)) {
      return u128.Zero;
    } else {
      return allowance.get(spenderId);
    }
  }

  @message({ mutates: true })
  approve(spender: AccountId, amount: u128): bool {
    const caller = env().caller<AccountId>();
    this._approve(caller, spender, amount);
    return true;
  }

  @message({ mutates: true })
  transferFrom(sender: AccountId, recipient: AccountId, amount: u128): bool {
    const caller = env().caller<AccountId>();
    const callerId = caller.toString();
    let allow = this.getAllowanceItem(sender);
    if (allow.has(callerId)) {
      let leftAllowance: u128 = allow.get(callerId);
      assert(leftAllowance >= amount, "allowance overflow");
      // @ts-ignore
      leftAllowance = leftAllowance - amount;
      this._approve(sender, caller, leftAllowance);
      this._transfer(sender, recipient, amount);
      return true;
    } else {
      return false;
    }
  }

  @message({ mutates: true })
  increaseAllowance(spender: AccountId, addedValue: u128): bool {
    const caller = env().caller<AccountId>();
    const info = this.getAllowanceItem(caller);
    const spenderId = spender.toString();
    if (info.has(spenderId)) {
      let leftAllowance: u128 = info.get(spenderId);
      // @ts-ignore
      leftAllowance += addedValue;
      assert(leftAllowance >= addedValue, "add overflow.");
      this._approve(caller, spender, leftAllowance);
      return true;
    } else {
      return false;
    }
  }

  @message({ mutates: true })
  decreaseAllowance(spender: AccountId, subtractedValue: u128): bool {
    const caller = env().caller<AccountId>();
    const info = this.getAllowanceItem(caller);
    const spenderId = spender.toString();
    if (info.has(spenderId)) {
      let leftAllowance: u128 = info.get(spenderId);
      assert(leftAllowance >= subtractedValue, "substract overflow.");
      // @ts-ignore
      leftAllowance -= subtractedValue;
      this._approve(caller, spender, leftAllowance);
      return true;
    } else {
      return false;
    }
  }

  protected _setupDecimals(decimal: u8): void {
    this.storage._decimal.set(decimal);
  }

  protected _mint(account: AccountId, amount: u128): void {
    assert(!account.eq(ZERO_ACCOUNT), "ERC20: mint to the zero address");
    let totalSupply = this.storage._totalSupply.get();
    // @ts-ignore
    totalSupply += amount;
    this.storage._totalSupply.set(totalSupply);

    const balance = this.storage.balances.getOrNull(account);
    if (!balance) {
      this.storage.balances.set(account, amount);
    } else {
      // @ts-ignore
      const leftValue = (balance as u128) + amount;
      this.storage.balances.set(account, leftValue);
    }

    const event = new Transfer(ZERO_ACCOUNT, account, amount);
    // @ts-ignore
    env().emitEvent(event);
  }

  protected _burn(account: AccountId, amount: u128): void {
    assert(!account.eq(ZERO_ACCOUNT), "ERC20: burn to the zero address");
    const balanceOfAccount = this.storage.balances.get(account);
    assert(balanceOfAccount >= amount, "ERC20: not enough balance to burn.");
    // @ts-ignore
    const leftValue = balanceOfAccount - amount;
    // @ts-ignore
    this.storage.balances.set(account, leftValue);
    let totalSupply = this.storage._totalSupply.get();
    // @ts-ignore
    totalSupply -= amount;
    this.storage._totalSupply.set(totalSupply);
    const event = new Transfer(account, ZERO_ACCOUNT, amount);
    // @ts-ignore
    env().emitEvent(event);
  }

  protected _approve(owner: AccountId, spender: AccountId, amount: u128): void {
    const spenderId = spender.toString();
    const allowance = this.getAllowanceItem(owner);
    allowance.set(spenderId, amount);
    // Note: should update Mapping by `set`.
    this.setAllowanceItem(owner, allowance);
    const event = new Approval(owner, spender, amount);
    // @ts-ignore
    env().emitEvent(event);
  }

  protected _transfer(sender: AccountId, recipient: AccountId, amount: u128): bool {
    assert(sender != ZERO_ACCOUNT, "ERC20: transfer from the zero address");
    assert(recipient != ZERO_ACCOUNT, "ERC20: transfer to the zero address");

    const spenderBalance = this.storage.balances.getOrNull(sender);
    assert(spenderBalance !== null);
    assert(spenderBalance! >= amount, "ERC20: transfer amount exceeds balance");

    // @ts-ignore
    const senderLeft: u128 = spenderBalance! - amount;
    this.storage.balances.set(sender, senderLeft);

    let recipientLeft = this.storage.balances.getOrNull(recipient);
    if (recipientLeft !== null) {
      // @ts-ignore
      recipientLeft = recipientLeft + amount;
    } else {
      recipientLeft = amount;
    }
    // @ts-ignore
    this.storage.balances.set(recipient, recipientLeft);
    const event = new Transfer(sender, recipient, amount);
    // @ts-ignore
    env().emitEvent(event);
    return true;
  }

  private setAllowanceItem(owner: AccountId, allowance: Map<string, u128>): void {
    this.storage.allowances.set(owner, allowance);
  }

  private getAllowanceItem(owner: AccountId): Map<string, u128> {
    let allowance = this.storage.allowances.getOrNull(owner);
    if (!allowance) {
      allowance = new Map();
      this.setAllowanceItem(owner, allowance);
    }
    return allowance;
  }
}
