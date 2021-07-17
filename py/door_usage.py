import requests, urllib3, json, datetime, time, helpers
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

config_dict = helpers.get_config()
start_of_day = datetime.time(config_dict["start_of_day_hrs"], config_dict["start_of_day_mins"])
end_of_day = datetime.time(config_dict["end_of_day_hrs"], config_dict["end_of_day_mins"])

def get_all_aps():
    aps_url = "https://" + config_dict["prime_ip"] + ":" + str(config_dict["prime_port"]) + "/webacs/api/v1/data/AccessPoints"
    try:
        r = requests.get(aps_url, auth=(config_dict["prime_user"], config_dict["prime_pw"]), verify=False)
        converted_content = helpers.parse_xml(r.text)
        return converted_content["queryResponse"]["entityId"]
    except Exception as e:
        helpers.log_to_file("get_aps(): " + str(e))
        return 0

def get_num_clients(ap_id):
    clients_url = "https://" + config_dict["prime_ip"] + ":" + str(config_dict["prime_port"]) + "/webacs/api/v1/data/AccessPoints/" + str(ap_id)
    try:
        r = requests.get(clients_url, auth=(config_dict["prime_user"], config_dict["prime_pw"]), verify=False)
        converted_content = helpers.parse_xml(r.text)
        return [converted_content["queryResponse"]["entity"]["accessPointsDTO"]["clientCount"], converted_content["queryResponse"]["entity"]["accessPointsDTO"]["name"]]
    except Exception as e:
        helpers.log_to_file("get_num_clients(): " + clients_url + " " + str(e))
        return [-1, -1]

def format_for_iotdata(uuid, value, ap_name, timestamp):
    try:
        iot_payload = {
            "UUID": str(uuid),
            "name": "com.davranetworks.wifi.clientcount",
            "value": value,
            "msg_type": "datum",
            "timestamp": timestamp,
            "tags": {"ap_name": ap_name}
        }
        return iot_payload
    except Exception as e:
        helpers.log_to_file("format_for_iotdata():" + str(e))
        return 0

def get_gps(router_id):
    auth_string = 'Bearer ' + config_dict["davra_token"]
    headers = {'Authorization': auth_string}
    payload_url = "http://" + config_dict["davra_url"] + "/api/v1/devices/" + str(router_id)
    try:
        r = requests.get(payload_url, headers=headers, timeout=10)
        response_dict = json.loads(r.text)
        return [response_dict["records"][0]["latitude"], response_dict["records"][0]["longitude"]]
    except Exception as e:
        helpers.log_to_file("get_gps(): " + str(e))
        return [0, 0]

def run_app():
    #all_aps = get_all_aps()
    for cluster in config_dict["clusters"]:
        if "zero_count" not in cluster:
            cluster["zero_count"] = 0 
        tot_clients = 0
        timestamp = int(time.time()) * 1000
        time_of_day = datetime.datetime.now().time()
        for ap in cluster["aps"]:
            #timestamp += 1
            ap_data = get_num_clients(ap)
            num_clients = int(ap_data[0])
            ap_name = str(ap_data[1])
            if num_clients != -1:
                tot_clients += num_clients
                iot_payload = format_for_iotdata(cluster["uuid"], int(num_clients), ap_name, timestamp)
                if iot_payload != 0:
                    helpers.send_to_iotdata(iot_payload, config_dict)
                else:
                    helpers.log_to_file("Unable to create IOT payload for AP " + str(ap))
            time.sleep(1)
        iot_payload = format_for_iotdata(cluster["uuid"], int(tot_clients), "Tot_All_APs", timestamp)
        helpers.send_to_iotdata(iot_payload, config_dict)
        if tot_clients == 0 and (start_of_day <= time_of_day <= end_of_day):
            cluster["zero_count"] += 1
            helpers.log_to_file("Zero count incremented for: " + cluster["name"] + ", " + str(cluster["zero_count"]))
        else:
            cluster["zero_count"] = 0
            helpers.log_to_file("Zero count reset for: " + cluster["name"])
        if cluster["zero_count"] > config_dict["zero_count_max"]:
            helpers.log_to_file("Zero count maximum exceeded for: " + cluster["name"])
            helpers.send_email("No WiFi clients for " + cluster["name"], config_dict["subject"], config_dict)

while True:
    try:
        run_app()
    except Exception as e:
        helpers.log_to_file("run_app(): " + str(e))
    time.sleep(60)