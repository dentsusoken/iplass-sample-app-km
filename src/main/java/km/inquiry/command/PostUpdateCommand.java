/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import java.util.Arrays;
import km.common.auth.AuthHelper;
import km.common.dao.EntityDaoHelper;
import km.common.util.CommandResponseUtil;
import km.inquiry.entity.Inquiry;
import km.inquiry.entity.Post;
import km.inquiry.enums.InquiryStatus;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.UploadFileHandle;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.webapi.WebApi;
import org.iplass.mtp.command.annotation.webapi.WebApiParamMapping;
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.entity.BinaryReference;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.entity.UpdateOption;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;

/**
 * 投稿を更新する。投稿の作成者だけが自分の投稿を編集できる。
 *
 * <p>WebAPI: POST /api/km/inquiry/post/update/{oid}/{postOid}</p>
 * <p>Accepts: multipart/form-data (content, attachments[])</p>
 *
 * <p>iPLAss の REST_FORM (multipart) 仕様に合わせ POST を使う。</p>
 *
 * <p>パスパラメータ: {oid} = 問合せ OID (${0})、{postOid} = 投稿 OID (${1})</p>
 */
@WebApi(
		name = "km/inquiry/post/update",
		accepts = RequestType.REST_FORM,
		methods = MethodType.POST,
		responseResults = {@WebApiResultAttribute(name = "result")},
		paramMapping = {
			@WebApiParamMapping(name = "oid", mapFrom = "${0}"),
			@WebApiParamMapping(name = "postOid", mapFrom = "${1}")
		},
		privileged = false)
@CommandClass(name = "km/inquiry/PostUpdateCommand")
public class PostUpdateCommand implements Command {

	@Override
	public String execute(RequestContext request) {
		String postOid = request.getParam("postOid");
		String content = request.getParam("content");

		// バリデーション
		if (content == null || content.trim().isEmpty()) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("VALIDATION_ERROR", "content is required"));
			return "ERROR";
		}

		EntityManager em = EntityDaoHelper.getEntityManager();

		// 投稿エンティティを排他ロック付きで読み込む
		Entity post = em.loadAndLock(postOid, Post.DEFINITION_NAME);
		if (post == null) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("POST_NOT_FOUND", "Post not found: " + postOid));
			return "ERROR";
		}

		// 現在のユーザーが投稿の作成者か確認する。
		// createBy は loadAndLock でも PrimitiveProperty (String の OID) で返る。
		String creatorOid = post.getValue(Post.CREATE_BY);
		String currentUserOid = AuthHelper.getCurrentUserOid();
		if (!currentUserOid.equals(creatorOid)) {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse(
							"FORBIDDEN_NOT_POST_OWNER", "Only the post creator can edit this post"));
			return "ERROR";
		}

		// 問合せがクローズ済みか確認する
		String inquiryOid = request.getParam("oid");
		Entity inquiry = em.loadAndLock(inquiryOid, Inquiry.DEFINITION_NAME);
		if (inquiry == null) {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse("INQUIRY_NOT_FOUND", "Inquiry not found: " + inquiryOid));
			return "ERROR";
		}

		SelectValue statusValue = inquiry.getValue(Inquiry.STATUS);
		InquiryStatus status = InquiryStatus.valueOf(statusValue.getValue());
		if (status.isClosed()) {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse(
							"INVALID_STATUS_TRANSITION", "Cannot edit posts on a closed inquiry"));
			return "ERROR";
		}

		// 更新エンティティを組み立てる
		Entity update = new GenericEntity(Post.DEFINITION_NAME);
		update.setOid(postOid);
		update.setValue(Post.CONTENT, content.trim());

		// 添付ファイルの処理 (全置換)
		UploadFileHandle[] files = request.getParamsAsFile("attachments");
		if (files != null && files.length > 0) {
			BinaryReference[] attachments = Arrays.stream(files)
					.map(UploadFileHandle::toBinaryReference)
					.toArray(BinaryReference[]::new);
			update.setValue(Post.ATTACHMENTS, attachments);
		} else {
			update.setValue(Post.ATTACHMENTS, null);
		}

		UpdateOption option = new UpdateOption(false);
		option.setUpdateProperties(Post.CONTENT, Post.ATTACHMENTS);
		em.update(update, option);

		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(null));
		return "SUCCESS";
	}
}
