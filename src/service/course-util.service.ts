import { ViewCreditsComponent } from '@app/component';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { PopoverController } from 'ionic-angular';
import { FileUtil } from 'sunbird';

@Injectable()
export class CourseUtilService {

    constructor(
        private fileUtil: FileUtil,
        private popOverCtrl: PopoverController,
    ) { }

    /**
     * Returns course progress in percentage
     * @param {any}    leafNodeCount
     * @param {number} progress Course Progress
     */
    getCourseProgress(leafNodeCount: any, progress: number) {
        if (leafNodeCount === 0 || leafNodeCount === '0' || leafNodeCount === undefined) {
            return 0;
        }

        const returnData = ((progress / leafNodeCount) * 100);

        if (isNaN(returnData)) {
            return 0;
        } else if (returnData > 100) {
            return 100;
        } else {
            const cProgress = String(returnData);
            return cProgress.split('.')[0];
        }
    }

    /**
     * Returns ImportContentRequest body
     * @param {object} identifiers
     * @param {boolean} isChild
     */
    getImportContentRequestBody(identifiers, isChild: boolean) {
        const requestParams = [];
        _.forEach(identifiers, (value, key) => {
            requestParams.push({
                isChildContent: isChild,
                destinationFolder: this.fileUtil.internalStoragePath(),
                contentId: value,
                correlationData: []
            });
        });

        return _.extend({}, requestParams);
    }

    /**
     * Opens up popup for the credits.
     */
    showCredits(content, pageId, rollup, correlation) {
        const popUp = this.popOverCtrl.create(
            ViewCreditsComponent,
            {
                content: content,
                pageId: pageId,
                rollUp: rollup,
                correlation: correlation
            },
            {
                cssClass: 'view-credits'
            }
        );
        popUp.present({
            ev: event
        });
    }
}
