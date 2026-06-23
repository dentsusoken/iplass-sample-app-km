/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import km.common.auth.AuthHelper;
import km.common.dao.EntityDaoHelper;
import km.common.lifecycle.LifecycleHookService;
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
import org.iplass.mtp.spi.ServiceRegistry;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;

/**
 * 既存の問合せに投稿を追加する。ステータスの自動遷移も扱う
 * (回答者の投稿で Open → Answered、利用者の投稿で Answered → Open)。
 *
 * <p>WebAPI: POST /api/km/inquiry/post/create/{oid}</p>
 * <p>Accepts: multipart/form-data (content, attachments[])</p>
 *
 * <p>同時実行の安全性のため loadAndLock を使う。Inquiry の posts 参照への投稿追加と
 * ステータス遷移を 1 回の update でまとめて適用する。</p>
 */
@WebApi(
		name = "km/inquiry/post/create",
		accepts = RequestType.REST_FORM,
		methods = MethodType.POST,
		responseResults = {@WebApiResultAttribute(name = "result")},
		paramMapping = @WebApiParamMapping(name = "oid", mapFrom = "${0}"),
		privileged = false)
@CommandClass(name = "km/inquiry/PostCreateCommand")
public class PostCreateCommand implements Command {

	@Override
	public String execute(RequestContext request) {
		String inquiryOid = request.getParam("oid");
		String content = request.getParam("content");

		// バリデーション
		if (content == null || content.trim().isEmpty()) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("VALIDATION_ERROR", "content is required"));
			return "ERROR";
		}

		EntityManager em = EntityDaoHelper.getEntityManager();

		// 同時実行の安全性のため、問合せを排他ロック付きで読み込む
		Entity inquiry = em.loadAndLock(inquiryOid, Inquiry.DEFINITION_NAME);
		if (inquiry == null) {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse("INQUIRY_NOT_FOUND", "Inquiry not found: " + inquiryOid));
			return "ERROR";
		}

		// 問合せがクローズ済みか確認する。
		// loadAndLock は Select プロパティを SelectValue として返す。
		SelectValue statusValue = inquiry.getValue(Inquiry.STATUS);
		InquiryStatus status = InquiryStatus.valueOf(statusValue.getValue());
		if (status.isClosed()) {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse(
							"INVALID_STATUS_TRANSITION", "Cannot add posts to a closed inquiry"));
			return "ERROR";
		}

		// 投稿エンティティを作成する
		Entity post = new GenericEntity(Post.DEFINITION_NAME);
		post.setName(inquiry.getName());
		post.setValue(Post.CONTENT, content.trim());

		// 添付ファイルの処理
		UploadFileHandle[] files = request.getParamsAsFile("attachments");
		if (files != null && files.length > 0) {
			BinaryReference[] attachments = Arrays.stream(files)
					.map(UploadFileHandle::toBinaryReference)
					.toArray(BinaryReference[]::new);
			post.setValue(Post.ATTACHMENTS, attachments);
		}

		// 投稿を登録する
		String postOid = em.insert(post);

		// posts 参照とステータス遷移を含む更新エンティティを組み立てる
		Entity postRef = new GenericEntity(Post.DEFINITION_NAME);
		postRef.setOid(postOid);

		Entity[] existingPosts = inquiry.getValue(Inquiry.POSTS);
		List<Entity> postsList = new ArrayList<>();
		if (existingPosts != null) {
			postsList.addAll(Arrays.asList(existingPosts));
		}
		postsList.add(postRef);

		Entity update = new GenericEntity(Inquiry.DEFINITION_NAME);
		update.setOid(inquiryOid);
		update.setValue(Inquiry.POSTS, postsList.toArray(new Entity[0]));

		// ステータスの自動遷移
		boolean isResponder = AuthHelper.isResponder();

		if (isResponder && status == InquiryStatus.Open) {
			update.setValue(Inquiry.STATUS, new SelectValue(InquiryStatus.Answered.name()));
		} else if (!isResponder && status == InquiryStatus.Answered) {
			update.setValue(Inquiry.STATUS, new SelectValue(InquiryStatus.Open.name()));
		} else {
			update.setValue(Inquiry.STATUS, inquiry.getValue(Inquiry.STATUS));
		}

		UpdateOption option = new UpdateOption(false);
		option.setUpdateProperties(Inquiry.POSTS, Inquiry.STATUS);
		em.update(update, option);

		// 主処理は完了済み。拡張が登録されていれば副次処理を呼ぶ (未登録ならスキップ)。
		ServiceRegistry registry = ServiceRegistry.getRegistry();
		if (registry.exists(LifecycleHookService.class)) {
			LifecycleHookService hook = registry.getService(LifecycleHookService.class);
			hook.afterInquirySaved(em, inquiryOid);
		}

		// レスポンス生成
		Map<String, Object> data = new HashMap<>();
		data.put("oid", postOid);

		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(data));
		return "SUCCESS";
	}
}
