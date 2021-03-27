import { hexToDec } from './hex2dec';

export function snowflake(options = {}) {

    options = options || {};
    var seq = 0;
    var mid = (options.mid || 1) % 1023;
    var offset = options.offset || 0;
    var lastTime = 0;

    const time = Date.now(),
        bTime = (time - offset).toString(2);

    // get the sequence number
    if (lastTime == time) {
        seq++;

        if (seq > 4095) {
            seq = 0;

            // make system wait till time is been shifted by one millisecond
            while (Date.now() <= time) { }
        }
    } else {
        seq = 0;
    }

    lastTime = time;

    let bSeq = seq.toString(2),
        bMid = mid.toString(2);

    // create sequence binary bit
    while (bSeq.length < 12) bSeq = "0" + bSeq;

    while (bMid.length < 10) bMid = "0" + bMid;

    const bid = bTime + bMid + bSeq;
    let id = "";

    for (let i = bid.length; i > 0; i -= 4) {
        id = parseInt(bid.substring(i - 4, i), 2).toString(16) + id;
    }

    return hexToDec(id);
}
