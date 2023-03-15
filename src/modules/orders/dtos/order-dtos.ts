import Decimal from "decimal.js";



export enum SideEnum {
  BID = "bid",
  ASK = "ask"

}

export class UpdateOrderDto {
  uuid: string; 
  price?: Decimal; 
  quote_amount?: Decimal;
}

export class OrderRequestDto {
  price: Decimal;
  quote_amount: Decimal;
  side: SideEnum;
}

export class OrderResponseDto {
  uuid: string;
  price: Decimal;
  quote_amount: Decimal;
  base_amount: Decimal;
  side: SideEnum;
}