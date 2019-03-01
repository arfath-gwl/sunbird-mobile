import {Component, Inject, NgZone} from '@angular/core';
import {AlertController, IonicPage, LoadingController, NavController, NavParams} from 'ionic-angular';
import {AddUpdateProfilesRequest, ObjectType,} from 'sunbird';
import {
  Environment,
  GetAllProfileRequest,
  Group,
  GroupService,
  InteractSubtype,
  InteractType,
  PageId,
  Profile,
  ProfileService,
  TelemetryObject,
} from 'sunbird-sdk';
import {GuestEditProfilePage} from '../../profile/guest-edit.profile/guest-edit.profile';
import {TelemetryGeneratorService} from '../../../service/telemetry-generator.service';
import {CommonUtilService} from '../../../service/common-util.service';

@IonicPage()
@Component({
  selector: 'page-add-or-remove-group-user',
  templateUrl: 'add-or-remove-group-user.html',
})
export class AddOrRemoveGroupUserPage {

  addUsers = true;
  userSelectionMap: Map<string, boolean> = new Map();
  memberSelectionMap: Map<string, boolean> = new Map();
  uniqueUserList: Array<Profile>;
  groupInfo: Group;
  groupMembers: Array<Profile>;
  uid: any;
  allUsers: Array<Profile> = [];
  selectedUids: Array<string> = [];

  selectedUserLength = '';
  selectedGroupMemberLength = '';

  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    @Inject('GROUP_SERVICE') private groupService: GroupService,
    @Inject('PROFILE_SERVICE') private profileService: ProfileService,
    private zone: NgZone,
    private loadingCtrl: LoadingController,
    private commonUtilService: CommonUtilService,
    private alertCtrl: AlertController,
    private telemetryGeneratorService: TelemetryGeneratorService
  ) {
    this.addUsers = Boolean(this.navParams.get('isAddUsers'));
    this.groupInfo = this.navParams.get('groupInfo');
    this.groupMembers = this.navParams.get('groupMembers');
  }

  ionViewWillEnter() {
    this.getAllProfile();
  }

  getAllProfile() {
    const req: GetAllProfileRequest = {
      local: true
    };

    this.profileService.getAllProfiles(req)
      .map((profiles) => profiles.filter((profile) => !!profile.handle))
      .subscribe((profiles) => {
        this.allUsers = profiles;
        const uniqueUserList = this.allUsers.filter(e => {
          const found = this.groupMembers.find(m => {
            return m.uid === e.uid;
          });
          return found === undefined;
        });
        this.zone.run(() => {
          this.uniqueUserList = uniqueUserList;

          if (!this.addUsers) {
            this.groupMembers.forEach((element, index) => {
              this.memberSelectionMap.set(this.groupMembers[index].uid, true);
            });
          }
        });
      }, (error) => {
        console.log('Something went wrong while fetching user list', error);
      });
  }

  toggleSelect(index: number) {
    let value = this.userSelectionMap.get(this.uniqueUserList[index].uid);
    if (value) {
      value = false;
    } else {
      value = true;
    }
    this.userSelectionMap.set(this.uniqueUserList[index].uid, value);
    //    this.getSelectedUids();
  }

  toggleMemberSelect(index: number) {
    let value = this.memberSelectionMap.get(this.groupMembers[index].uid);
    if (value) {
      value = false;
    } else {
      value = true;
    }
    this.memberSelectionMap.set(this.groupMembers[index].uid, value);
  }

  goToEditGroup(index) {
    this.navCtrl.push(GuestEditProfilePage, {});
  }

  isUserSelected(index: number) {
    console.log('Index', index);
    this.getSelectedUids();
    return Boolean(this.userSelectionMap.get(this.uniqueUserList[index].uid));
  }

  isGroupMemberSelected(index: number) {
    this.getSelectedGroupMemberUids();
    return Boolean(this.memberSelectionMap.get(this.groupMembers[index].uid));
  }

  selectAll() {
    this.userSelectionMap.clear();
    this.zone.run(() => {
      this.uniqueUserList.forEach((element, index) => {
        this.userSelectionMap.set(this.uniqueUserList[index].uid, true);
      });
    });
    // this.getSelectedUids();
  }

  unselectAll() {
    this.zone.run(() => {
      this.memberSelectionMap.clear();
      this.groupMembers.forEach((element, index) => {
        this.memberSelectionMap.set(this.groupMembers[index].uid, false);
      });
    });
  }

  remove() {
    this.groupMembers.forEach((item) => {
      if (!Boolean(this.memberSelectionMap.get(item.uid))) {
        this.selectedUids.push(item.uid);
      }
    });

    this.deleteUsersFromGroupConfirmBox(this.selectedGroupMemberLength);
  }

  getSelectedUids() {
    const selectedUids: Array<string> = [];
    this.uniqueUserList.forEach((item) => {
      if (Boolean(this.userSelectionMap.get(item.uid))) {
        selectedUids.push(item.uid);
      }
    });

    console.log('selectedUids', selectedUids.length);
    this.zone.run(() => {
      this.selectedUserLength = (selectedUids.length) ? selectedUids.length.toString() : '';
    });
    return selectedUids;
  }

  getSelectedGroupMemberUids() {
    const selectedUids: Array<string> = [];
    this.groupMembers.forEach((item) => {
      if (Boolean(this.memberSelectionMap.get(item.uid))) {
        selectedUids.push(item.uid);
      }
    });

    console.log('selectedUids', selectedUids.length);
    this.zone.run(() => {
      this.selectedGroupMemberLength = (selectedUids.length) ? selectedUids.length.toString() : '';
    });
  }

  add() {
    const loader = this.getLoader();
    loader.present();
    const groupMembersUids: Array<string> = [];

    this.groupMembers.forEach(element => {
      groupMembersUids.push(element.uid);
    });


    const req: AddUpdateProfilesRequest = {
      groupId: this.groupInfo.gid,
      uidList: groupMembersUids.concat(this.getSelectedUids())
    };
    this.groupService.addProfilesToGroup(req)
      .subscribe((success) => {
          console.log(success);
          loader.dismiss();
          this.commonUtilService.showToast(this.commonUtilService.translateMessage('GROUP_MEMBER_ADD_SUCCESS'));
          this.navCtrl.popTo(this.navCtrl.getByIndex(this.navCtrl.length() - 2));
        },
        (error) => {
          loader.dismiss();
          this.commonUtilService.showToast(this.commonUtilService.translateMessage('SOMETHING_WENT_WRONG'));
          console.log('Error : ' + error);
          loader.dismiss();
        });
  }

  deleteUsersFromGroupConfirmBox(length) {
    const alert = this.alertCtrl.create({
      title: this.commonUtilService.translateMessage('REMOVE_MULTIPLE_USERS_FROM_GROUP', length),
      mode: 'wp',
      message: this.commonUtilService.translateMessage('USER_DELETE_CONFIRM_SECOND_MESSAGE'),
      cssClass: 'confirm-alert',
      buttons: [
        {
          text: this.commonUtilService.translateMessage('CANCEL'),
          role: 'cancel',
          cssClass: 'alert-btn-cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: this.commonUtilService.translateMessage('YES'),
          cssClass: 'alert-btn-delete',
          handler: () => {
            this.deleteUsersFromGroup();
          }
        }
      ]
    });
    alert.present();
  }

  deleteUsersFromGroup() {
    let telemetryObject: TelemetryObject;
    telemetryObject = new TelemetryObject(this.groupInfo.gid, ObjectType.GROUP, undefined);

    const valuesMap = new Map();
    valuesMap['UIDS'] = this.selectedUids;

    // Generate Delete users from group event
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.TOUCH,
      InteractSubtype.DELETE_USER_INITIATE,
      Environment.USER,
      PageId.REMOVE_USERS_FROM_GROUP,
      telemetryObject,
      valuesMap
    );
    const loader = this.getLoader();
    const req: AddUpdateProfilesRequest = {
      groupId: this.groupInfo.gid,
      uidList: this.selectedUids
    };

    this.groupService.addProfilesToGroup(req)
      .subscribe((success) => {
          console.log(success);
          loader.dismiss();
          this.commonUtilService.showToast(this.commonUtilService.translateMessage('GROUP_MEMBER_DELETE_SUCCESS'));
          this.navCtrl.popTo(this.navCtrl.getByIndex(this.navCtrl.length() - 2));
        },
        (error) => {
          loader.dismiss();
          this.commonUtilService.showToast(this.commonUtilService.translateMessage('SOMETHING_WENT_WRONG'));
          console.log('Error : ' + error);
          loader.dismiss();
        });
  }

  /**
   * Returns Loader Object
   */
  getLoader(): any {
    return this.loadingCtrl.create({
      duration: 30000,
      spinner: 'crescent'
    });
  }

  getGradeNameFromCode(data: Profile | Group): string {
    if (data.grade && data.grade.length > 0) {
      const gradeName = [];
      data.grade.forEach(code => {
        if (data.gradeValue && data.gradeValue[code]) {
          gradeName.push(data.gradeValue[code]);
        }
      });

      if (gradeName.length === 0) {
        return data.grade.join(',');
      }

      return gradeName.join(',');
    }

    return '';
  }
}
