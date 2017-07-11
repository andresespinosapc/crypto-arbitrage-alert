import requests
import time
import itertools
import pymysql


def main(conn):
    coins = [
        'VERI', 'PAY', 'FUN', 'DICE', 'ADX', 'ADT', 'SNT', 'EOS', 'ICE', 'HMQ', 'PLU', 'BAT']
    coins = ['PAY', 'FUN', 'ADX', 'EOS', 'SNT', 'HMQ', 'PLU', 'BAT', 'ADT']
    blacklist = ['BAT', 'PLU', 'ADT']
    # TEMP
    blacklist = ['PAY', 'FUN', 'ADX', 'EOS', 'SNT', 'HMQ', 'PLU', 'BAT', 'ADT']

    markets = {}

    while True:
        try:
            # Separate from previous prints
            print('\n{}'.format(time.strftime('%H:%M:%S %d/%m')))

            # Ver si hay STORJ en bittrex
            # r = requests.get('https://bittrex.com/api/v1.1/public/getticker', params={'market': 'ETH-STORJ'})
            # data = r.json()
            # if data['success']:
            #     data = data['result']
            #     if data is not None:
            #         if data['Ask'] > 0 or data['Bid'] > 0 or data['Last'] > 0:
            #             params = {
            #                 'chat_id': 8834684,
            #                 'text': 'SALIO STORJ!!!!!'
            #             }
            #             for i in range(15):
            #                 for j in range(10):
            #                     requests.get('https://api.telegram.org/bot423299318:AAGSZaf9hy8_KNy2QAtLebSA_9uJovuc4sU/sendMessage', params=params)
            #                 time.sleep(5)

            # Get data from EtherDelta
            r = requests.get('https://cache1.etherdelta.com/returnTicker')
            data_ethdelta = r.json()
            markets['etherdelta'] = {}
            markets['bittrex'] = {}
            markets['liqui'] = {}
            markets['kraken'] = {}
            for coin, value in data_ethdelta.items():
                try:
                    markets['etherdelta'][coin.replace('ETH_', '')] = {
                        'last': float(value['last']),
                        'ask': float(value['ask']),
                        'bid': float(value['bid']),
                        'daily_volume': float(value['baseVolume'])
                    }
                except KeyError as e:
                    print('Could not get {} for {} in etherdelta'.format(e, coin))

            for coin in coins:
                # Get data from Bittrex
                try:
                    r = requests.get('https://bittrex.com/api/v1.1/public/getticker', params={'market': 'ETH-{}'.format(coin)})
                    data_bittrex = r.json().get('result')
                    if data_bittrex:
                        markets['bittrex'][coin] = {
                            'last': data_bittrex['Last'],
                            'ask': data_bittrex['Ask'],
                            'bid': data_bittrex['Bid']
                        }
                    else:
                        print('ERROR bittrex:', r.json())
                except KeyError as e:
                    print('Could not get {} for {} in bittrex'.format(e, coin))
                # Get data from Liqui
                try:
                    s = '{}_eth'.format(coin.lower())
                    r = requests.get('https://api.liqui.io/api/3/ticker/{}'.format(s))
                    data_liqui = r.json()[s]
                    markets['liqui'][coin] = {
                        'last': data_liqui['last'],
                        'ask': data_liqui['sell'],
                        'bid': data_liqui['buy'],
                        'daily_volume': data_liqui['vol']
                    }
                except KeyError as e:
                    print('Could not get {} for {} in liqui'.format(e, coin))
                # Get data from Kraken
                try:
                    r = requests.get('https://api.kraken.com/0/public/Ticker', params={'pair': '{}eth'.format(coin.lower())})
                    data_kraken = r.json()
                    markets['kraken'][coin] = {
                        'last': data_kraken['c'][0],
                        'ask': data_kraken['a'][0],
                        'bid': data_kraken['b'][0],
                        'daily_volume': data_kraken['v'][1]
                    }
                except KeyError as e:
                    print('Could not get {} for {} in kraken'.format(e, coin))

                print('\nMarkets values in {}:'.format(coin))
                for market, value in markets.items():
                    value = value.get(coin)
                    if value:
                        with conn.cursor() as cursor:
                            query = '''INSERT INTO ticker (coin1, coin2, website, last, bid, ask, daily_volume)
                                VALUES ("ETH", %s, %s, %s, %s, %s, %s)'''
                            cursor.execute(query, (coin, market, value.get('last'), value.get('bid'),
                                value.get('ask'), value.get('daily_volume')))
                            conn.commit()
                    print('{}: {}'.format(market, value))

                print('\nDifferences in {}:'.format(coin))
                for market1, market2 in itertools.combinations(markets.keys(), 2):
                    try:
                        diff = abs(1 - markets[market1][coin]['ask'] / markets[market2][coin]['ask'])
                        print('{}-{}: {}'.format(market1, market2, diff))
                        if diff >= 0.1 and coin not in blacklist:
                            params = {
                                'chat_id': 8834684,
                                'text': 'Hay una diferencia de {} en {} entre {} y {}'.format(diff, coin, market1, market2)
                            }
                            requests.get('https://api.telegram.org/bot423299318:AAGSZaf9hy8_KNy2QAtLebSA_9uJovuc4sU/sendMessage', params=params)
                    except KeyError as e:
                        pass
                        #print('Could not get difference between {} and {} in {} ({})'.format(market1, market2, coin, e))
        except Exception as e:
            print('ERROR:', e)

        time.sleep(60)

conn = pymysql.connect(
    host='localhost',
    user='andres',
    password='3661071a',
    db='crypto',
    cursorclass=pymysql.cursors.DictCursor)

try:
    main(conn)
finally:
    conn.close()
