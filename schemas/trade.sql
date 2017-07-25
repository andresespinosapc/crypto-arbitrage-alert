CREATE TABLE trade (
  id int PRIMARY KEY NOT NULL AUTO_INCREMENT,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  website varchar(30) NOT NULL,
  type varchar(10) not null,
  base_coin varchar(5) not null,
  trade_coin varchar(5) not null,
  price float not null,
  base_amount float not null,
  website_timestamp timestamp
)
