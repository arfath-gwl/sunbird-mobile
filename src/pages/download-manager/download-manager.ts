import { AppGlobalService } from './../../service/app-global.service';
// import { SortAttribute } from './download-manager.interface';
import { DownloadManagerPageInterface, AppStorageInfo } from './download-manager.interface';
import { MenuOverflow, ContentType, AudienceFilter } from './../../app/app.constant';
import { ViewController } from 'ionic-angular/navigation/view-controller';
import { CommonUtilService } from '@app/service';
import { Component, NgZone, Inject, OnInit } from '@angular/core';
import { IonicPage, NavController, NavParams, PopoverController, Events, Loading, Popover } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import {
  ContentRequest, ContentService, DownloadService, Profile, ContentDeleteResponse, ContentDeleteRequest,
  ContentSortCriteria, SortOrder, ContentDeleteStatus, DeviceInfo, ContentSpaceUsageSummaryRequest, ContentSpaceUsageSummaryResponse
} from 'sunbird-sdk';
import { Content, ProfileType } from 'sunbird-sdk';
import { AppHeaderService } from '@app/service';
import { ActiveDownloadsPage } from '../active-downloads/active-downloads';
import { SbPopoverComponent } from '@app/component';

/**
 * Generated class for the DownloadManagerPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-download-manager',
  templateUrl: 'download-manager.html',
})
export class DownloadManagerPage implements DownloadManagerPageInterface, OnInit {
  headerObservable: any;

  storageInfo: AppStorageInfo;
  downloadedContents: Content[] = [];
  profile: Profile;
  audienceFilter = [];
  guestUser = false;
  defaultImg: string;
  loader?: Loading;
  deleteAllConfirm: Popover;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private translate: TranslateService,
    private ngZone: NgZone,
    private popoverCtrl: PopoverController,
    private commonUtilService: CommonUtilService,
    private viewCtrl: ViewController,
    private headerServie: AppHeaderService, private events: Events,
    private appGlobalService: AppGlobalService,
    @Inject('CONTENT_SERVICE') private contentService: ContentService,
    @Inject('DEVICE_INFO') private deviceInfo: DeviceInfo,
  ) {
  }

  ngOnInit() {
    this.defaultImg = 'assets/imgs/ic_launcher.png';
    this.getCurrentUser();
    this.getDownloadedContents();
    this.subscribeEvents();
  }

  ionViewWillEnter() {
    this.events.subscribe('update_header', (data) => {
      this.headerServie.showHeaderWithHomeButton(['download']);
    });
    this.headerObservable = this.headerServie.headerEventEmitted$.subscribe(eventName => {
      this.handleHeaderEvents(eventName);
    });

    this.headerServie.showHeaderWithHomeButton(['download']);
    this.getAppStorageInfo();
  }

  getAppStorageInfo() {

    const req: ContentSpaceUsageSummaryRequest = { paths: [cordova.file.externalDataDirectory] };
    this.contentService.getContentSpaceUsageSummary(req).toPromise()
      .then((res: ContentSpaceUsageSummaryResponse[]) => {
        this.deviceInfo.getAvailableInternalMemorySize().toPromise()
          .then((size) => {
            this.storageInfo = {
              usedSpace: res[0].sizeOnDevice,
              availableSpace:  parseInt(size, 10)
            };
            console.log('this.storageInfo', this.storageInfo);
          });
      });


  }

  getCurrentUser(): void {
    this.guestUser = !this.appGlobalService.isUserLoggedIn();
    const profileType = this.appGlobalService.getGuestUserType();

    if (this.guestUser) {
      if (profileType === ProfileType.TEACHER) {
        this.audienceFilter = AudienceFilter.GUEST_TEACHER;
      } else if (profileType === ProfileType.STUDENT) {
        this.audienceFilter = AudienceFilter.GUEST_STUDENT;
      }
    } else {
      this.audienceFilter = AudienceFilter.LOGGED_IN_USER;
    }

    this.profile = this.appGlobalService.getCurrentUser();
  }

  async getDownloadedContents(sortCriteria?) {
    this.loader = this.commonUtilService.getLoader();
    this.loader.present();
    this.loader.onDidDismiss(() => { this.loader = undefined; });
    const defaultSortCriteria: ContentSortCriteria[] = [{
      sortAttribute: 'sizeOnDevice',
      sortOrder: SortOrder.DESC
    }];
    const requestParams: ContentRequest = {
      uid: this.profile ? this.profile.uid : undefined,
      contentTypes: ContentType.FOR_LIBRARY_TAB,
      audience: this.audienceFilter,
      sortCriteria: sortCriteria || defaultSortCriteria
    };
    console.log('requestParams', requestParams);
    await this.contentService.getContents(requestParams).toPromise()
      .then(data => {
        data.forEach((value) => {
          value.contentData['lastUpdatedOn'] = value.lastUpdatedTime;
          if (value.contentData.appIcon) {
            if (value.contentData.appIcon.includes('http:') || value.contentData.appIcon.includes('https:')) {
              if (this.commonUtilService.networkInfo.isNetworkAvailable) {
                value.contentData.appIcon = value.contentData.appIcon;
              } else {
                value.contentData.appIcon = this.defaultImg;
              }
            } else if (value.basePath) {
              value.contentData.appIcon = value.basePath + '/' + value.contentData.appIcon;
            }
          }

        });
        this.ngZone.run(() => {
          console.log('downloadedContents', data);
          this.downloadedContents = data;
          this.loader.dismiss();
        });
      })
      .catch(() => {
        this.ngZone.run(() => {
          this.loader.dismiss();
        });
      });
  }

  deleteContents(contentsList) {
    console.log('in parent deleteContents', contentsList);
    const contentDeleteRequest: ContentDeleteRequest = {
      contentDeleteList: contentsList
    };
    if (contentsList.length > 1) {
      this.deleteAllContents(contentDeleteRequest);
    } else {
      this.loader = this.commonUtilService.getLoader();
      this.loader.present();
      this.loader.onDidDismiss(() => { this.loader = undefined; });
      // const telemetryObject = new TelemetryObject(this.content.identifier, this.content.contentType, this.content.pkgVersion);

      // this.telemetryGeneratorService.generateInteractTelemetry(
      //   InteractType.TOUCH,
      //   InteractSubtype.DELETE_CLICKED,
      //   Environment.HOME,
      //   this.pageName,
      //   telemetryObject,
      //   undefined,
      //   this.objRollup,
      //   this.corRelationList);


      console.log('contentDeleteRequest', contentDeleteRequest);
      this.contentService.deleteContent(contentDeleteRequest).toPromise()
        .then((data: ContentDeleteResponse[]) => {
          console.log('deleteContentresp', data);
          this.loader.dismiss();
          // this.getDownloadedContents();
          if (data && data[0].status === ContentDeleteStatus.NOT_FOUND) {
            this.commonUtilService.showToast(this.commonUtilService.translateMessage('CONTENT_DELETE_FAILED'));
          } else {
            this.events.publish('savedResources:update', {
              update: true
            });
            this.commonUtilService.showToast(this.commonUtilService.translateMessage('MSG_RESOURCE_DELETED'));
          }
        }).catch((error: any) => {
          this.loader.dismiss();
          console.log('delete response err: ', error);
          this.commonUtilService.showToast(this.commonUtilService.translateMessage('CONTENT_DELETE_FAILED'));
        });
    }
  }

  deleteAllContents(contentDeleteRequest: ContentDeleteRequest) {
    console.log('in cancel deleteall contents', contentDeleteRequest);
    this.deleteAllConfirm = this.popoverCtrl.create(SbPopoverComponent, {
      sbPopoverHeading: this.commonUtilService.translateMessage('DELETE_PROGRESS'),
      actionsButtons: [
        {
          btntext: this.commonUtilService.translateMessage('CANCEL_LOWER_CASE'),
          btnClass: 'sb-btn sb-btn-sm  sb-btn-outline-info cancel-delete'
        },
      ],
      icon: null,
      sbPopoverMainTitle: '0/' + contentDeleteRequest.contentDeleteList.length,
      metaInfo: this.commonUtilService.translateMessage('FILES_DELETED'),
      // sbPopoverContent: this.commonUtilService.translateMessage('FILES_DELETED')
    }, {
        cssClass: 'sb-popover danger sb-popover-cancel-delete',
      });
    this.deleteAllConfirm.present({
      ev: event
    });
    this.deleteAllConfirm.onDidDismiss((cancel: any) => {
      console.log('onDidDismiss cancel', cancel);
      if (cancel) {
        this.contentService.clearContentDeleteQueue().toPromise();
        // this.viewCtrl.dismiss();
      }
    });
    this.contentService.enqueueContentDelete(contentDeleteRequest).toPromise();
    this.contentService.getContentDeleteQueue().skip(1).takeWhile((list) => !!list.length)
    .finally(() => {
      this.deleteAllConfirm.dismiss();
      this.getAppStorageInfo();
      this.events.publish('savedResources:update', {
        update: true
      });
    })
    .subscribe((list) => {
      console.log('deleteList', list);
      this.events.publish('deletedContentList:changed', {
        deletedContentsInfo: {
          totalCount: contentDeleteRequest.contentDeleteList.length,
          deletedCount: contentDeleteRequest.contentDeleteList.length - list.length
        }
      });
    });
  }


  onSortCriteriaChange(sortAttribute): void {
    console.log('parent onSortCriteriaChange', sortAttribute);
    let sortAttr: string;
    if (sortAttribute.content === 'Content size') {
      sortAttr = 'sizeOnDevice';
    } else if (sortAttribute.content === 'Last viewed') {
      sortAttr = 'lastUsedOn';
    }
    const sortCriteria: ContentSortCriteria[] = [{
      sortOrder: SortOrder.DESC,
      sortAttribute: sortAttr
    }];
    this.getDownloadedContents(sortCriteria);
  }

  ionViewWillLeave(): void {
    this.events.unsubscribe('update_header');
    this.headerObservable.unsubscribe();
    // this.events.unsubscribe('savedResources:update');
  }

  subscribeEvents() {
    this.events.subscribe('savedResources:update', (res) => {
      if (res && res.update) {
        this.getDownloadedContents();
      }
    });
  }

  handleHeaderEvents($event) {
    console.log('inside handleHeaderEvents', $event);
    switch ($event.name) {
      case 'download': this.download();
        break;
    }
  }

  download() {
    this.navCtrl.push(ActiveDownloadsPage);
  }

}