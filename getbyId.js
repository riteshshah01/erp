/**
 *
 * @NApiVersion 2.0
 * @NScriptType RestLet
 * @NModuleScope Public
 *
 */
const DEPENDENCIES = [
    'N/search',
    'N/record',
    'N/error'
];

const CE_OBJECT_TO_SUITE_OBJECT = {
    "customers": "customer",
    "invoices": "invoice",
    "customer-payments": "customerpayment",
    "vendors": "vendor",
    "vendor-bills": "vendorbill"
};

define(DEPENDENCIES, function (Search, Record) {

    const ELEMENT_KEY = "netsuiterestlets";
    const GENERIC_EXCEPTION = "Something Bad Happened";

    const LOG_LEVEL_DEBUG = "debug";
    const LOG_LEVEL_ERROR = "error";
    const BULK_ERROR = "BULK_ERROR";


    const STATUS_CODE = {
        "bad_request": "MISSING_REQD_PARAMS",
        "empty_results": "EMPTY_RECORDS_IN_SYSTEM"
    };

    const BULK_ERRORS = {
        "bulk_payload_error": "bulk create only supports array of objects"
    };

    const ACTIONS = {
        post: doexecute,
        get: hearbeat,
        put: hearbeat,
        delete: hearbeat
    };

    /**
     * Summary. Get a record in Netsuite by its Internal Id.
     *
     * @param datain Data Passed as part of rest call, mostly a body of post, must be of type application/json
     *
     * Usage : datain.method : getbyId, datain.recordtype: 'customer', datain.id: '600'
     */
    function getRecordById(datain) {
        var requestPayload = {};
        requestPayload.type = datain.type;
        requestPayload.id = datain.payload.id;
        try {
            celog(LOG_LEVEL_DEBUG, "ERROR occurred while preparing objects", "here");
            return formatRecord(Record.load(requestPayload));
        } catch (err) {
            celog(LOG_LEVEL_DEBUG, "ERROR occurred while preparing objects", err);
            return prepareErrorObject(err.name, err);
        }
    }

    /**
     * Summary. No op Function is used when used does an operation which is not supported yet by the script
     */
    function NoOp() {
        return prepareErrorObject(STATUS_CODE.bad_request, "This operation is not supported by ce");
    }

    /**
     * Summary. Validate any mandatory params required for the core functions, this is kind of a filter.
     * Validation for some mandatory params
     */
    function validateForMandatoryFields(datain) {
        var message = "";
        if (datain.method == "heartbeat") {
            return;
        }
        if (!datain.method) {
            message = "Missing method param in request body";
            throw prepareErrorObject(STATUS_CODE.bad_request, message);
        }
        if (!datain.payload) {
            message = "Missing payload object in request body";
            throw prepareErrorObject(STATUS_CODE.bad_request, message);
        }
        return null;
    }

    /**
     * Summary. This is used to check if the script is running fine in the NetSuite System.
     * Description.
     * Heart beat function to check if apis are accessible.
     * CE USAGE: provision auth validation
     */
    function hearbeat() {
        var object = new Object();
        object.dateTime = new Date().toISOString();
        object.endpoint = ELEMENT_KEY;
        return object;
    }

    /**
     * Utils code area
     */

    /**
     *
     * Summary. Utility function to prepare error objects
     *
     * @Param code maps to any unique identifier for that problem.
     * @Param message Any status message passed to user to let him know what exactly went wrong.
     */
    function prepareErrorObject(code, message) {
        var err = {};
        var errorObject = {};
        errorObject.message = message;
        err.error = errorObject;
        return err;
    }

    /**
     * Summary. Driver function to call all the inner functions
     *
     * @param datain Data Passed as part of rest call, mostly a body of post, must be of type application/json
     */
    function doexecute(datain) {
        var validationResults = validateForMandatoryFields(datain);
        if (validationResults != null) {
            celog(LOG_LEVEL_ERROR, "Error in validation", "Error in validating mandatory params");
            return validationResults;
        }
        return doExecuteRecords(datain);
    }

    function doExecuteRecords(datain) {
        if (datain.method === "getbyId") {
            return getRecordById(datain);
        } else {
            return NoOp();
        }
    }

    /**
     * Summary. Formats a record object to get the record values and sets the record values.
     *
     * @param record
     * @return {Object}
     */
    function formatRecord(record) {
        var object = new Object();
        object.id = record.id;
        //construct fields
        var fieldsList = record.getFields();
        for (var i = 0; i < fieldsList.length; i++) {
            var eachField = fieldsList[i];
            object[eachField] = record.getValue({
                fieldId: eachField
            });
        }
        // construct sublists
        var subLists = record.getSublists();
        for (var sublistIdx = 0; sublistIdx < subLists.length; sublistIdx++) {
            var eachSublistId = subLists[sublistIdx];
            var sublist = object[eachSublistId] || [];

            try {
                var linesCount = record.getLineCount({
                    sublistId: eachSublistId
                });

                var fieldsForSublist = record.getSublistFields({
                    sublistId: eachSublistId
                });

                for (var lineIdx = 0; lineIdx < linesCount; lineIdx++) {
                    var lineObject = {};
                    for (var fieldIdx = 0; fieldIdx < fieldsForSublist.length; fieldIdx++) {
                        var fieldOfaLine = fieldsForSublist[fieldIdx];
                        var valueOfEachFieldInLine = record.getSublistValue({
                            sublistId: eachSublistId,
                            fieldId: fieldsForSublist[fieldIdx],
                            line: lineIdx
                        });
                        lineObject[fieldOfaLine] = valueOfEachFieldInLine;
                        celog(LOG_LEVEL_DEBUG, "Sublist Value::" + eachSublistId, valueOfEachFieldInLine);
                    }
                    if (lineObject != null || lineObject != undefined) {
                        sublist.push(lineObject);
                    }
                }
            } catch (recordFormatErr) {
                celog(LOG_LEVEL_DEBUG, "Error occurred while converting sublist::" + eachSublistId, recordFormatErr);
            }
            object[eachSublistId] = sublist;
        }
        return object;
    }


    /**
     * Summary. logger utility to log statements with log level.
     * @param datain
     */
    function celog(loglevel, logtitle, logdetails) {
        if (loglevel == LOG_LEVEL_DEBUG) {
            log.debug({ title: logtitle, details: logdetails });
        }

        if (loglevel == LOG_LEVEL_ERROR) {
            log.error({ title: logtitle, details: logdetails });
        }
    }

    return ACTIONS;
});
