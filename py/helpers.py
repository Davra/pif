import requests, json, xmltodict, logging, smtplib
from datetime import datetime
from logging.handlers import RotatingFileHandler

def log_to_file(message):
    log_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    logger = logging.getLogger("Rotating Log")
    logger.setLevel(logging.INFO)
    handler = RotatingFileHandler("error.log", maxBytes=2000, backupCount=5)
    logger.addHandler(handler)
    logger.info(str(log_time) + ": " + str(message))
    print(str(log_time) + ": " + str(message))

def write_to_cache(name,content):
    content = json.dumps(content)
    try:
        cachefile = open(name, 'w')
        cachefile.write(content)
        cachefile.close()
        return 1
    except Exception as e:
        log_to_file("write_to_cache(): " + str(e))
        return 0

def read_from_cache():
    try:
        with open("rssi_status_all_dict.json") as cachefile:
            content = json.load(cachefile)
            return content
    except Exception as e:
        log_to_file("read_from_cache(): " + str(e))
        return {}

def get_config():
    try:
        with open("config.json") as json_data:
            config_dict = json.load(json_data)
            return config_dict
    except Exception as e:
        log_to_file("get_config(): " + str(e))
        return 0

def parse_xml(xml_content):
    try:
        content_dict = xmltodict.parse(xml_content)
        return content_dict
    except Exception as e:
        log_to_file("parse_xml(): " + str(e))
        return 0

def get_devices(config_dict):
    auth_string = 'Bearer ' + config_dict["davra_token"]
    headers = { 'Authorization': auth_string }
    payload_url = "http://" + config_dict["davra_url"] + "/api/v1/devices"
    #print payload_url
    try:
        r = requests.get(payload_url, headers=headers, timeout=10)
        if str(r.text) != "None":
            return r.text
        else:
            return []
    except Exception as e:
        #print "asasdasd"
        log_to_file("get_devices(): " + str(e))
        return 0

def create_device(uuid, config_dict):
    device_def = { "name": uuid, "UUID": uuid }
    contents = json.dumps(device_def)
    auth_string = 'Bearer ' + config_dict["davra_token"]
    headers = { 'Authorization': auth_string }
    payload_url = "http://" + config_dict["davra_url"] + "/api/v1/devices"
    try:
        print("Creating device")
        r = requests.post(payload_url, data=contents, headers=headers, timeout=10)
        return r.status_code
    except Exception as e:
        log_to_file("create_device(): " + str(e))
        return 0

def find_device(uuid, config_dict):
    devices_resp = json.loads(get_devices(config_dict))
    devices = devices_resp["records"]
    found = 0
    for device in devices:
        try:
            if device["UUID"] == str(uuid):
                found = 1
                break
        except Exception as e:
            log_to_file("find_device(): " + str(e))
    if found == 0:
        create_device(uuid, config_dict)
        return 0
    else:
        return 1

def send_to_iotdata(payload, config_dict):
    contents = json.dumps(payload)
    auth_string = 'Bearer ' + config_dict["davra_token"]
    headers = { 'Authorization': auth_string }
    payload_url = "http://" + config_dict["davra_url"] + "/api/v1/iotdata"
    try:
        requests.put(payload_url, data=contents, headers=headers, timeout=15)
    except Exception as e:
        log_to_file("send_to_iotdata(): " + str(e))
        return 0

def send_davra_alert(alert_dict, config_dict):
    alert_json = json.dumps(alert_dict)
    headers = { 'Accept':'application/json', 'Content-Type': 'application/json', 'Authorization': "Bearer " + config_dict["davra_token"] }
    iotdata_url = "http://" + config_dict["davra_url"] + "/api/v1/iotdata"
    try:
        r = requests.put(iotdata_url,data=alert_json, headers=headers)
        print(r.status_code)
        return r.text
    except Exception as e:
        print(str(e))
        return 0

def send_email(alert_message, alert_subject, config_dict):
    email_user = config_dict["email_user"]
    email_password = config_dict["email_password"]
    smtp_server = config_dict["smtp_server"]
    try:
        port = int(config_dict["smtp_port"])
    except Exception as e:
        log_to_file("send_email(): " + str(e))
        port = 587
    to = config_dict["to"]
    recipients = to.split(",")
    subject = str(alert_subject)

    email_text = """
    %s
    """ % (alert_message)

    try:
        if port == 465:
            #print "Setting SSL"
            server = smtplib.SMTP_SSL(smtp_server, port)
        else:
            server = smtplib.SMTP(smtp_server, port)
        server.ehlo()
        if port == 587:
            server.starttls()
        server.ehlo()
        server.login(email_user, email_password)
        message = 'Subject: {}\n\n{}'.format(subject, email_text)
        server.sendmail(email_user, recipients, message)
        server.close()
        server.close()
        return 1
    except Exception as e:
        log_to_file("send_email(): " + str(e))
        return 0

def find_device_name(uuid, config_dict):
    all_devices = get_devices(config_dict)
    all_devices_json = json.loads(all_devices)
    records_list = all_devices_json["records"]
    device_name = ""
    for record in records_list:
        if record["UUID"] == uuid or record["serialNumber"] == uuid:
            device_name = record["name"]
            break
        else:
            device_name = "Unknown device"
    return device_name

def find_deviceId(uuid, config_dict):
    all_devices = get_devices(config_dict)
    all_devices_json = json.loads(all_devices)
    records_list = all_devices_json["records"]
    deviceId = ""
    for record in records_list:
        if record["UUID"] == uuid:
            deviceId = record["deviceId"]
            break
        else:
            deviceId = "Unknown deviceId"
    return deviceId